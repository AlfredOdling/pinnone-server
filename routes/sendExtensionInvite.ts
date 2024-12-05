import { sendEmail } from './sendEmail'

export const sendExtensionInvite = async ({ emails }) => {
  const emails_ = emails.split(',').map((email) => email.trim())

  await Promise.all(
    emails_.map(async (email) => {
      try {
        return await sendEmail({
          fromEmail: 'info@pinneone.com',
          toEmail: email,
          emailSubject: '[PinnOne] Download the extension',
          emailText:
            'Here is your link to download the extension: https://chromewebstore.google.com/detail/pinnone/naadkflophinjbdfehdcpbkbdmddncbd',
        })
      } catch (error) {
        throw error
      }
    })
  )
}
