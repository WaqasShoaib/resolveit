export async function sendOppositePartyInvite(params: {
  email?: string;
  phone?: string;
  url: string;
  caseNumber?: string;
  name?: string;
}) {
  // For now we just log the URL. Later: plug in SendGrid/Twilio.
  console.log('=== ResolveIt Invite ===');
  console.log('To:', params.email || params.phone || '(no contact)');
  console.log('Case:', params.caseNumber);
  console.log('Consent URL:', params.url);
  console.log('========================');
}
