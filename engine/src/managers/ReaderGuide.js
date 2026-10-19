// Reader-facing onboarding, independent of the authoring tutorial.
export function showReaderGuide({ choose = false, language = 'en', mode = 'guided', physical = false, onChoose, onClose }) {
  const fi = language === 'fi'
  const dialog = document.createElement('dialog')
  dialog.setAttribute('aria-label', fi ? 'Näin liikut tarinassa' : 'Move through the story')
  dialog.style.cssText = 'max-width:560px;width:calc(100% - 32px);max-height:85vh;overflow:auto;border:1px solid #ddd;border-radius:16px;padding:32px;background:#fff;color:#222;font:16px/1.6 Segoe UI,sans-serif;box-shadow:0 20px 90px #0004'
  const title = document.createElement('h2')
  title.textContent = choose ? (fi ? 'Valitse kokemuksesi' : 'Choose your experience') : (fi ? 'Näin liikut tarinassa' : 'Move through the story')
  title.style.cssText = 'font-size:26px;line-height:1.2;margin:0 0 18px'
  dialog.appendChild(title)
  const paragraph = text => { const p = document.createElement('p'); p.textContent = text; dialog.appendChild(p) }
  paragraph(fi ? 'Kuulokkeilla kuulet tilan ja kertojan parhaiten. Voit liikkua molemmissa tiloissa.' : 'Headphones help you hear the space and the narrator. You can move in both modes.')
  const button = (label, action, selected = false) => {
    const b = document.createElement('button'); b.textContent = label
    b.style.cssText = 'display:block;width:100%;text-align:left;margin:12px 0;padding:16px;border:1px solid #ccc;border-radius:10px;cursor:pointer;font:inherit;color:#222;background:' + (selected ? '#f9df65' : '#fafafa')
    b.onclick = action; dialog.appendChild(b)
  }
  const close = () => { dialog.close(); dialog.remove(); onClose?.() }
  if (choose) {
    button(fi ? 'Ohjattu — tarina ohjaa näkymääsi pehmeästi' : 'Guided — gentle moves bring each moment into view', () => { close(); onChoose('guided') }, mode === 'guided')
    button(fi ? 'Tutki — valitse itse mihin liikut ja katsot' : 'Explore — choose where you move and look', () => { close(); onChoose('explore') }, mode === 'explore')
  }
  paragraph(physical
    ? (fi ? 'Tutki-tilassa puhelimen kamera seuraa liikkumistasi. Ohjattu tila käyttää laitteen suuntaa, ellei tekijä ole valinnut myös tilaseurantaa.' : 'Explore uses camera-based world tracking on your phone. Guided uses device orientation unless the author enables world tracking too.')
    : (fi ? 'Tässä 3D-näkymässä liikut hiirellä tai kosketuksella. Puhelimen AR-tilassa voit myös liikkua fyysisesti.' : 'In this Web 3D view, navigate with a mouse or touch. Phone AR also supports physical movement.'))
  paragraph(fi ? 'Vedä ylös tai alas liikkuaksesi, sivulle kääntyäksesi. Ohjatussa tilassa vetäminen keskeyttää nykyisen kameraliikkeen; seuraava tarinan hetki ohjaa taas. Keskitä palauttaa viimeiseen ohjattuun näkymään tai aloituspaikkaan.' : 'Drag up or down to move, sideways to turn. In Guided, dragging takes control until the next story cue. Recenter returns to the latest guided destination or the starting view.')
  paragraph(fi ? 'Pysäytä tauottaa tarinan. Luvut ja kieli löytyvät valikosta. Napauta korostettua esinettä tutkiaksesi sitä ja uudelleen palauttaaksesi sen.' : 'Pause stops the story clock. Open the menu icon for chapters, language and recentering. Tap a highlighted object to inspect it; tap again to put it back.')
  if (!choose) button(fi ? 'Jatka' : 'Continue', close, true)
  dialog.addEventListener('cancel', e => { if (choose) e.preventDefault(); else { e.preventDefault(); close() } })
  document.body.appendChild(dialog); dialog.showModal()
  return dialog
}
