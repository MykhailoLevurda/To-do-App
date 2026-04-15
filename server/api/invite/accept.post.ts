import { defineEventHandler, readBody, getHeader, setResponseStatus } from 'h3';
import { getAdminFirestore, getAdminAuth } from '../../utils/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyInviteToken } from '../invite.post';

export default defineEventHandler(async (event) => {
  try {
    const authHeader = getHeader(event, 'authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      setResponseStatus(event, 401);
      return { success: false, error: 'Chybi autorizacni token' };
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
      setResponseStatus(event, 500);
      return { success: false, error: 'Firebase Admin neni nakonfigurovan' };
    }

    let decodedToken: { uid: string; email?: string };
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      setResponseStatus(event, 401);
      return { success: false, error: 'Neplatny nebo expirovany token' };
    }

    const body = await readBody(event);
    const { projectId: bodyProjectId, inviteToken } = body;

    // Pokud je přiložen invite token, ověř HMAC podpis a vytáhni projectId z tokenu
    let projectId: string;
    if (inviteToken && typeof inviteToken === 'string') {
      const tokenData = verifyInviteToken(inviteToken);
      if (!tokenData) {
        setResponseStatus(event, 400);
        return { success: false, error: 'Neplatny nebo expirovany pozvankovny token' };
      }
      projectId = tokenData.projectId as string;
    } else if (bodyProjectId && typeof bodyProjectId === 'string') {
      // Zpětná kompatibilita – přijmout i bez tokenu (pro starší pozvánky)
      projectId = bodyProjectId;
    } else {
      setResponseStatus(event, 400);
      return { success: false, error: 'Chybi projectId nebo inviteToken' };
    }

    const userEmail = (decodedToken.email || '').toLowerCase().trim();
    if (!userEmail) {
      setResponseStatus(event, 400);
      return { success: false, error: 'Uzivatel nema email' };
    }

    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      setResponseStatus(event, 404);
      return { success: false, error: 'Projekt nenalezen' };
    }

    const data = projectDoc.data()!;
    const pendingEmails = (data.pendingInviteEmails || []) as string[];
    const pendingEmailsLower = pendingEmails.map((e) => e.toLowerCase());

    if (!pendingEmailsLower.includes(userEmail)) {
      setResponseStatus(event, 403);
      return { success: false, error: 'Nemate cekajici pozvanku do tohoto projektu' };
    }

    const members = (data.teamMembers || []) as Array<{
      userId: string;
      email?: string;
      displayName?: string;
      addedAt: unknown;
      addedBy: string;
      role?: string;
    }>;

    const pendingIndex = members.findIndex(
      (m) => m.email?.toLowerCase() === userEmail && m.userId?.startsWith?.('pending_')
    );
    if (pendingIndex === -1) {
      setResponseStatus(event, 404);
      return { success: false, error: 'Pozvanka nenalezena' };
    }

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const displayName =
      userDoc.data()?.displayName || decodedToken.name || userEmail.split('@')[0];

    const newMember = {
      userId: decodedToken.uid,
      email: userEmail,
      displayName,
      addedAt: members[pendingIndex].addedAt,
      addedBy: members[pendingIndex].addedBy,
      role: members[pendingIndex].role === 'admin' ? 'admin' : 'member'
    };

    const updatedMembers = [...members];
    updatedMembers[pendingIndex] = newMember;

    const memberRoles = updatedMembers.reduce<Record<string, string>>(
      (acc, m) => ({ ...acc, [m.userId]: m.role === 'admin' ? 'admin' : 'member' }),
      {}
    );
    const memberIds = updatedMembers.map((m) => m.userId);
    const newPendingEmails = pendingEmails.filter((e) => e.toLowerCase() !== userEmail);

    await projectRef.update({
      teamMembers: updatedMembers,
      memberRoles,
      memberIds,
      pendingInviteEmails: newPendingEmails,
      updatedAt: FieldValue.serverTimestamp()
    });

    return { success: true, projectId };
  } catch (e: any) {
    console.error('[Invite Accept API] Error:', e);
    setResponseStatus(event, 500);
    return { success: false, error: e.message || 'Chyba pri prijeti pozvanky' };
  }
});
