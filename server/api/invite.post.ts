import { defineEventHandler, readBody, setResponseStatus } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email, invitedBy, invitedByName } = body;

    console.log('[Invite API] Received request:', { email, invitedBy, invitedByName });

    if (!email || !invitedBy) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: 'Email a invitedBy jsou povinné parametry'
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

    // TODO: V produkci zde implementujte skutečné odeslání emailu
    // Například pomocí:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Resend
    // - Nebo jiného email servisu

    // Pro demo účely jen logujeme
    console.log('[Invite API] Sending invitation:', {
      email,
      invitedBy,
      invitedByName,
      timestamp: new Date().toISOString()
    });

    // Vytvořte pozvánkový token/link
    let inviteToken: string;
    try {
      inviteToken = generateInviteToken(email, invitedBy);
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

    // DEMO MODE: V produkci byste zde odeslali email pomocí email služby
    // Např. SendGrid, Mailgun, AWS SES, Resend atd.
    // Pro demo účely pouze logujeme a simulujeme úspěšné odeslání
    
    const emailSubject = `Pozvánka do týmu - ${invitedByName || 'Freelo'}`;
    const emailBody = `
Pozvánka do týmu

${invitedByName || 'Někdo'} vás pozval/a do týmu na Freelo Dashboard.

Klikněte na odkaz pro připojení:
${inviteLink}

Tento odkaz je platný 7 dní.
    `.trim();

    // V produkci odkomentujte a implementujte:
    /*
    try {
      await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailBody.replace(/\n/g, '<br>')
      });
      console.log('[Invite API] Email sent successfully to:', email);
    } catch (emailError: any) {
      console.error('[Invite API] Email sending failed:', emailError);
      setResponseStatus(event, 500);
      return {
        success: false,
        error: 'Chyba při odesílání emailu: ' + emailError.message
      };
    }
    */

    // DEMO: Simulujeme úspěšné odeslání (v produkci byste tu nebyli)
    console.log('[Invite API] DEMO MODE - Email would be sent:', {
      to: email,
      subject: emailSubject,
      link: inviteLink
    });

    // Pro demo - vraťme success
    setResponseStatus(event, 200);
    return {
      success: true,
      message: 'Pozvánka byla odeslána (DEMO MODE)',
      inviteLink, // Pro demo - v produkci neposílejte link v response
      email,
      demo: true // Indikace, že jde o demo režim
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
 * Generuje token pro pozvánku
 * V produkci použijte bezpečnější metodu (např. JWT)
 */
function generateInviteToken(email: string, invitedBy: string): string {
  const data = {
    email: email.toLowerCase().trim(),
    invitedBy,
    timestamp: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dní
  };
  
  // Pro demo - jednoduché base64 encoding
  // V produkci použijte JWT nebo jinou bezpečnou metodu
  
  const json = JSON.stringify(data);
  
  // V Node.js prostředí Nuxt server API máme Buffer dostupný globálně
  // Pokud by nefungoval, použijeme alternativu
  try {
    // @ts-ignore - Buffer je globální v Node.js
    if (typeof Buffer !== 'undefined') {
      // @ts-ignore
      return Buffer.from(json, 'utf-8').toString('base64').replace(/[+/=]/g, '');
    }
  } catch (e) {
    console.warn('[Invite API] Buffer not available, using fallback');
  }
  
  // Fallback - použijeme jednoduché encoding
  // V produkci byste měli použít JWT nebo jinou bezpečnou metodu
  return encodeURIComponent(json);
}

