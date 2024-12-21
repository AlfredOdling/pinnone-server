export const createLabel = async (gmail) => {
  let receiptsLabelId: string
  const labels = await gmail.users.labels.list({ userId: 'me' })

  const receiptsLabel = labels.data.labels?.find(
    (label) => label.name === 'Receipts'
  )

  if (!receiptsLabel) {
    const newLabel = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: 'Receipts',
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
        color: {
          textColor: '#ffffff',
          backgroundColor: '#16a765',
        },
      },
    })
    receiptsLabelId = newLabel.data.id!
  } else {
    receiptsLabelId = receiptsLabel.id!
  }

  return receiptsLabelId
}
