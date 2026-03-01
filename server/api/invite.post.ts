import { defineEventHandler, readBody, setResponseStatus } from 'h3';
import { Resend } from 'resend';

export default defineEventHandler(async (event) => {
  console.log('[Invite API] Request received', new Date().toISOString());
  try {
    const body = await readBody(event);
    const { email, invitedBy, invitedByName, projectId, projectName, role } = body;

    console.log('[Invite API] Received request:', { email, invitedBy, invitedByName, projectId, projectName });

    if (!email || !invitedBy || !projectId) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: 'Email, invitedBy a projectId jsou povinné parametry'
      };
    }

    // Validace emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: 'Neplatný formát emailu'
      };
    }

    console.log('[Invite API] Sending invitation:', {
      email,
      invitedBy,
      invitedByName,
      timestamp: new Date().toISOString()
    });

    // Vytvořte pozvánkový token/link
    let inviteToken: string;
    try {
      inviteToken = generateInviteToken(email, invitedBy, projectId, role || 'member');
    } catch (tokenError: any) {
      console.error('[Invite API] Token generation failed:', tokenError);
      setResponseStatus(event, 500);
      return {
        success: false,
        error: 'Chyba při generování pozvánkového tokenu: ' + tokenError.message
      };
    }

    const appUrl = process.env.NUXT_PUBLIC_APP_URL || process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const inviteLink = `${appUrl}/invite/${inviteToken}`;

    console.log('[Invite API] Generated invite link:', inviteLink);

    const emailSubject = `Pozvánka do projektu${projectName ? ` ${projectName}` : ''} - Scrum Board`;
    const emailBodyHtml = `
<p>Pozvánka do projektu</p>
<p>${invitedByName || 'Někdo'} vás pozval/a do projektu${projectName ? ` „${projectName}"` : ''} na Scrum Board.</p>
<p><a href="${inviteLink}">Klikněte zde pro připojení</a></p>
<p>Tento odkaz je platný 7 dní.</p>
    `.trim();

    const hasResendKey = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxx';
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    // Resend preferuje formát "Jméno <email@domena.cz>" pro lepší doručitelnost
    const fromFormatted = fromAddress.includes('<') ? fromAddress : `Scrum Board <${fromAddress}>`;

    if (hasResendKey) {
      try {
        console.log('[Invite API] Sending via Resend:', { from: fromFormatted, to: email });
        const resend = new Resend(process.env.RESEND_API_KEY!);
        const { data, error } = await resend.emails.send({
          from: fromFormatted,
          to: [email],
          subject: emailSubject,
          html: emailBodyHtml
        });
        if (error) {
          console.error('[Invite API] Resend error:', error);

          const msg = (error.message || '').toLowerCase();
          const isResendDomainRestriction =
            (error.statusCode === 403 || error.name === 'validation_error') &&
            (msg.includes('only send testing emails') ||
              msg.includes('verify a domain') ||
              msg.includes('verify your domain') ||
              msg.includes('domain is not verified') ||
              msg.includes('unverified domain'));

          if (isResendDomainRestriction) {
            setResponseStatus(event, 200);
            return {
              success: true,
              message: 'Pozvánka připravena – zkopírujte odkaz a pošlete ho ručně. Resend vyžaduje ověřenou doménu pro odesílání. Zkontrolujte stav DNS na resend.com/domains.',
              inviteLink,
              email,
              resendRestriction: true
            };
          }

          setResponseStatus(event, 500);
          return {
            success: false,
            error: 'Chyba při odesílání emailu: ' + (error.message || 'Neznámá chyba')
          };
        }
        console.log('[Invite API] Email sent successfully:', { to: email, resendId: data?.id, from: fromFormatted });
        setResponseStatus(event, 200);
        return {
          success: true,
          message: 'Pozvánka byla odeslána',
          email
        };
      } catch (emailError: any) {
        console.error('[Invite API] Email sending failed:', emailError);
        setResponseStatus(event, 500);
        return {
          success: false,
          error: 'Chyba při odesílání emailu: ' + (emailError.message || 'Neznámá chyba')
        };
      }
    }

    // DEMO MODE: Resend API klíč není nastaven
    console.log('[Invite API] DEMO MODE - RESEND_API_KEY not set. Email would be sent:', {
      to: email,
      subject: emailSubject,
      link: inviteLink
    });
    setResponseStatus(event, 200);
    return {
      success: true,
      message: 'Pozvánka byla odeslána (DEMO MODE – nastavte RESEND_API_KEY pro skutečné odeslání)',
      inviteLink,
      email,
      demo: true
    };
  } catch (error: any) {
    console.error('[Invite API] Error:', error);
    console.error('[Invite API] Error stack:', error.stack);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: error.message || 'Nastala chyba při odesílání pozvánky'
    };
  }
});

/**
 * Generuje token pro pozvánku (Base64URL – URL-safe)
 */
function generateInviteToken(email: string, invitedBy: string, projectId: string, role: string = 'member'): string {
  const data = {
    email: email.toLowerCase().trim(),
    invitedBy,
    projectId,
    role: role === 'admin' ? 'admin' : 'member',
    timestamp: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dní
  };

  const json = JSON.stringify(data);

  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(json, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
  } catch (e) {
    console.warn('[Invite API] Buffer not available, using fallback');
  }

  return encodeURIComponent(json);
}

