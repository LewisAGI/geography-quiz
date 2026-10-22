export async function shareCard(date: string, correct: number, total: number, streak: number): Promise<void> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#e4efe6'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#1f4e5f'
  ctx.fillRect(0, 0, canvas.width, 28)
  ctx.fillStyle = '#14211b'
  ctx.font = '600 96px Fraunces, Georgia, serif'
  ctx.fillText('Meridian', 88, 250)
  ctx.font = '500 46px Outfit, sans-serif'
  ctx.fillStyle = '#3e5348'
  ctx.fillText(date, 88, 340)
  ctx.fillStyle = '#14211b'
  ctx.font = '650 188px Fraunces, Georgia, serif'
  ctx.fillText(`${correct} / ${total}`, 88, 660)
  ctx.font = '600 72px Outfit, sans-serif'
  ctx.fillStyle = '#b5522a'
  ctx.fillText(String(streak), 88, 800)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return
  const file = new File([blob], `meridian-${date}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
}
