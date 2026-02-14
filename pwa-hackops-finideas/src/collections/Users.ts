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
        return 'Reset Your Password - HackOps'
      },

      generateEmailHTML: ({ token, user } = {}) => {
        const resetPasswordURL = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`

        return `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style>
                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 30px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                }
                .header h1 {
                  margin: 0;
                  font-size: 24px;
                }
                .content {
                  background: #f9f9f9;
                  padding: 30px;
                  border-radius: 0 0 10px 10px;
                }
                .button {
                  display: inline-block;
                  padding: 12px 30px;
                  background: #667eea;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                  font-weight: bold;
                }
                .footer {
                  text-align: center;
                  margin-top: 20px;
                  color: #666;
                  font-size: 12px;
                }
                .link {
                  word-break: break-all;
                  color: #667eea;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Reset Your Password</h1>
                </div>
                <div class="content">
                  <p>Hi${user?.email ? ` ${user.email}` : ' there'},</p>
                  <p>You requested to reset your password for your HackOps account.</p>
                  <p>Click the button below to reset your password:</p>
                  <p>
                    <a href="${resetPasswordURL}" class="button">Reset Password</a>
                  </p>
                  <p>Or copy and paste this link into your browser:</p>
                  <p class="link">${resetPasswordURL}</p>
                  <p><strong>This link will expire in 1 hour.</strong></p>
                  <p>If you didn't request a password reset, please ignore this email.</p>
                </div>
                <div class="footer">
                  <p>&copy; 2026 HackOps. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `
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