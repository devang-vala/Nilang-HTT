import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    // Allow anyone (unauthenticated) to create a user (public registration)
    create: () => true,

    // Admin can read all, regular users can only read themselves
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        id: { equals: user.id },
      }
    },

    // Only the user themselves or an admin can update
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return {
        id: { equals: user.id },
      }
    },

    // Only admins can delete users
    delete: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },

    // THIS controls who can log into the /admin panel
    admin: ({ req: { user } }) => {
      if (!user) return false
      return user.role === 'admin'
    },
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30, // 30 days

    forgotPassword: {
      generateEmailSubject: () => {
        return 'Reset Your Password - Finideas'
      },

      generateEmailHTML: ({ token, user } = {}) => {
        const resetPasswordURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Finideas Official Mail</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff; font-family:Verdana, sans-serif;">

  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#000000;">
        <tr>
          <td style="padding:16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle" style="color:#ffffff;">
                  <div style="font-size:20px; font-weight:bold;">FINIDEAS</div>
                  <div style="font-size:12px; color:#cccccc; letter-spacing:0.4px;">INVESTMENT ADVISORY & CONFERENCE LEAD MANAGEMENT</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
          <td style="padding:24px; font-size:14px; line-height:1.7; text-align:left; color:#222222;">
            <p>Hi${user?.email ? ` ${user.email}` : ' there'},</p>
            <p>You requested to reset your password for your Finideas account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="margin:20px 0;">
              <a href="${resetPasswordURL}" style="display:inline-block; padding:12px 30px; background-color:#000000; color:#ffffff; text-decoration:none; font-weight:bold;">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break:break-all; color:#2563eb;">${resetPasswordURL}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#000000;">
        <tr>
          <td style="padding:16px; text-align:center;">
            <div style="font-size:11px; color:#999999;">© Finideas. All rights reserved.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>

</body>
</html>
        `.trim()
      },
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      required: true,
      // Prevent regular users from escalating their own role
      access: {
        update: ({ req: { user } }) => {
          return user?.role === 'admin'
        },
      },
    },
  ],
}