/**
 * EmailService — powered by Supabase (inviteUserByEmail)
 *
 * Uses the Supabase Admin Auth API to send invitation emails via the
 * email template you configured in:
 *   Supabase Dashboard → Authentication → Email Templates → Invite User
 *
 * The `redirectTo` URL in each call points to your frontend's
 * /invite/accept?token=<mongo_token> page, so clicking the email button
 * lands the user directly on your acceptance flow.
 *
 * Required env vars:
 *   SUPABASE_URL          https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_KEY  service_role key (Settings → API → service_role)
 *   FRONTEND_URL          https://your-app.vercel.app  (or http://localhost:3000)
 *
 * NOTE: The service_role key has admin privileges. Never expose it to the
 * browser or commit it to source control.
 */

const { createClient } = require('@supabase/supabase-js');

// ── Supabase admin client (lazily created once per process) ───────────────────

let _adminClient = null;

const getAdminClient = () => {
  if (_adminClient) return _adminClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      '[EmailService] SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. ' +
      'Find them in Supabase → Project Settings → API. ' +
      'Use the service_role key (not the anon key) for admin email operations.'
    );
  }

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });

  return _adminClient;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send an invitation email via Supabase Auth.
 *
 * Supabase uses your configured "Invite User" email template and sends it
 * to `to`. The `redirectTo` value is embedded in the template's action URL
 * so clicking the button lands the user on your `/invite/accept?token=…` page.
 *
 * @param {object} options
 * @param {string} options.to          Recipient email address
 * @param {string} options.inviteToken Your MongoDB invitation token
 * @param {object} [options.metadata]  Optional extra data stored on the Supabase user record
 *
 * @returns {Promise<{ messageId: string }>}
 * @throws  {Error} If Supabase returns an error
 */
const sendInviteEmail = async ({ to, inviteToken, metadata = {} }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const redirectTo  = `${frontendUrl}/invite/accept?token=${inviteToken}`;

  console.log(`[EmailService] Supabase invite → to:${to}`);
  console.log(`[EmailService] redirectTo: ${redirectTo}`);

  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(to, {
    redirectTo,
    data: metadata, // stored in user_metadata on the Supabase user record
  });

  if (error) {
    // Supabase returns "User already registered" when the email already exists
    // in the Supabase Auth table. That is fine for our MongoDB flow — the user
    // will still receive the email and can click through to accept.
    if (
      error.message?.toLowerCase().includes('already registered') ||
      error.message?.toLowerCase().includes('already been invited')
    ) {
      console.warn(
        `[EmailService] Supabase: "${error.message}" for ${to} — ` +
        'user already exists in Supabase Auth. Continuing with MongoDB invite flow.'
      );
      return { messageId: 'supabase-existing-user' };
    }

    console.error(`[EmailService] Supabase error: ${error.message}`);
    throw new Error(`Email delivery failed via Supabase: ${error.message}`);
  }

  const messageId = data?.user?.id || 'unknown';
  console.log(`[EmailService] ✓ Supabase invite sent | Supabase user ID: ${messageId}`);

  return { messageId };
};

/**
 * Generic sendEmail shim — kept so any future callers using the old signature
 * still work. For invitations, prefer sendInviteEmail directly.
 *
 * @param {object} options
 * @param {string} options.to
 * @param {string} [options.inviteToken]  Pass this to trigger the Supabase invite template
 */
const sendEmail = async ({ to, inviteToken, metadata }) => {
  return sendInviteEmail({ to, inviteToken: inviteToken || '', metadata });
};

module.exports = { sendEmail, sendInviteEmail };
