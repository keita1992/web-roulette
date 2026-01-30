import './style.css'

const app = document.querySelector('#app')
const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Web Roulette'

app.innerHTML = `
  <div class="app-shell" id="appShell">
    <header class="app-header">
      <div class="title-group">
        <p class="eyebrow">Web Roulette</p>
        <div class="title-row">
          <h1 class="app-title" id="appTitle"></h1>
        </div>
      </div>
      <div class="header-actions">
        <span class="storage-warning" id="storageWarning" hidden>localStorageが使えないため、保存されません。</span>
      </div>
    </header>

    <main class="app-main">
      <section class="wheel-panel">
        <div class="wheel-card">
          <div class="wheel-wrap" id="wheelWrap" role="button" tabindex="0" aria-label="ルーレットを回す">
            <div class="wheel-pointer" aria-hidden="true"></div>
            <svg class="wheel" id="wheelSvg" viewBox="0 0 400 400" role="img" aria-label="ルーレット">
              <g id="wheelGroup"></g>
            </svg>
            <div class="wheel-guide" id="wheelGuide">
              <p>クリック / Space で回転</p>
              <span>タップでも開始できます</span>
            </div>
          </div>
          <div class="wheel-meta">
            <div class="meta-item"><span class="meta-label">候補</span><span id="candidateCount">0</span></div>
          </div>
        </div>
      </section>

      <aside class="control-panel" id="controlPanel">
        <div class="panel-header">
          <button class="ghost-button panel-toggle" id="panelToggle" type="button">パネル</button>
        </div>

        <div class="primary-actions">
          <button class="primary-button" id="spinBtn" type="button">開始</button>
          <button class="danger-button" id="resetBtn" type="button">リセット</button>
          <div class="error-box" id="errorBox" role="status" aria-live="polite"></div>
          <label class="option-toggle">
            <input type="checkbox" id="excludeToggle" checked />
            <span>当選者を次回除外</span>
          </label>
          <div class="result-panel" id="resultPanel" hidden>
            <p class="result-label">当選</p>
            <p class="result-text" id="resultText"></p>
            <div class="result-actions">
              <button class="ghost-button small" id="clearResultBtn" type="button">閉じる</button>
            </div>
          </div>
        </div>

        <div class="editor" id="editor">
        <div class="editor-header">
          <h3>候補入力</h3>
        </div>
        <textarea
          id="candidateInput"
          class="candidate-input"
          placeholder="1行1候補で入力（最大100件）"
          rows="10"
        ></textarea>
      </div>

        <div class="secondary-actions"></div>

        <div class="shortcuts" id="shortcuts">
          <h3>ショートカット</h3>
          <div class="shortcut-grid">
            <span>Space</span><span>回転開始</span>
            <span>X</span><span>結果を閉じる</span>
            <span>R</span><span>リセット</span>
          </div>
        </div>
      </aside>
    </main>

  </div>
`

const STORAGE_KEY = 'web-roulette:v1'
const MAX_ITEMS = 100
const svgNS = 'http://www.w3.org/2000/svg'

const elements = {
  appShell: document.querySelector('#appShell'),
  appTitle: document.querySelector('#appTitle'),
  wheelWrap: document.querySelector('#wheelWrap'),
  wheelSvg: document.querySelector('#wheelSvg'),
  wheelGroup: document.querySelector('#wheelGroup'),
  wheelGuide: document.querySelector('#wheelGuide'),
  candidateCount: document.querySelector('#candidateCount'),
  spinBtn: document.querySelector('#spinBtn'),
  resetBtn: document.querySelector('#resetBtn'),
  errorBox: document.querySelector('#errorBox'),
  excludeToggle: document.querySelector('#excludeToggle'),
  candidateInput: document.querySelector('#candidateInput'),
  resultPanel: document.querySelector('#resultPanel'),
  resultText: document.querySelector('#resultText'),
  clearResultBtn: document.querySelector('#clearResultBtn'),
  storageWarning: document.querySelector('#storageWarning'),
  controlPanel: document.querySelector('#controlPanel'),
  panelToggle: document.querySelector('#panelToggle'),
}

const palette = [
  '#F45D48',
  '#F78C2A',
  '#F9C74F',
  '#90BE6D',
  '#43AA8B',
  '#4D908E',
  '#277DA1',
  '#577590',
  '#D1495B',
  '#F28482',
  '#BCB8B1',
  '#84A59D',
]

const state = {
  items: [],
  excluded: [],
  pendingExclusions: [],
  excludeWinners: true,
  lastWinner: null,
  spinning: false,
  showResult: false,
  showGuide: true,
  storageAvailable: true,
  rotation: 0,
  panelCollapsed: false,
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const mobileQuery = window.matchMedia('(max-width: 980px)')

mobileQuery.addEventListener('change', (event) => {
  if (!event.matches) {
    state.panelCollapsed = false
    updateUI()
  }
})

function storageAvailable() {
  try {
    const testKey = '__roulette_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch (error) {
    return false
  }
}

function loadState() {
  state.storageAvailable = storageAvailable()
  elements.storageWarning.hidden = state.storageAvailable
  if (!state.storageAvailable) {
    return
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.items)) state.items = parsed.items
    if (Array.isArray(parsed.excluded)) state.excluded = parsed.excluded
    if (Array.isArray(parsed.pendingExclusions)) state.pendingExclusions = parsed.pendingExclusions
    if (typeof parsed.excludeWinners === 'boolean') state.excludeWinners = parsed.excludeWinners
  } catch (error) {
    // Ignore broken storage
  }
}

function saveState() {
  if (!state.storageAvailable) return
  const payload = {
    items: state.items,
    excluded: state.excluded,
    pendingExclusions: state.pendingExclusions,
    excludeWinners: state.excludeWinners,
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    // Ignore storage failure
  }
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360
}

function parseCandidates(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function reconcileExcluded(items, excluded) {
  const counts = new Map()
  items.forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1)
  })
  const used = new Map()
  const nextExcluded = []
  excluded.forEach((item) => {
    const allowed = counts.get(item) || 0
    const usedCount = used.get(item) || 0
    if (usedCount < allowed) {
      nextExcluded.push(item)
      used.set(item, usedCount + 1)
    }
  })
  return nextExcluded
}

function getAvailableItems(items, excluded) {
  if (!excluded.length) return [...items]
  const excludedCounts = new Map()
  excluded.forEach((item) => {
    excludedCounts.set(item, (excludedCounts.get(item) || 0) + 1)
  })
  const result = []
  items.forEach((item) => {
    const count = excludedCounts.get(item) || 0
    if (count > 0) {
      excludedCounts.set(item, count - 1)
    } else {
      result.push(item)
    }
  })
  return result
}

function cryptoRandomInt(max) {
  if (max <= 0) return 0
  if (!window.crypto || !window.crypto.getRandomValues) {
    throw new Error('crypto-unavailable')
  }
  const range = 0x100000000
  const limit = Math.floor(range / max) * max
  const uint32 = new Uint32Array(1)
  let value = 0
  do {
    window.crypto.getRandomValues(uint32)
    value = uint32[0]
  } while (value >= limit)
  return value % max
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function randomIntBetween(min, max) {
  return Math.floor(randomBetween(min, max + 1))
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle * Math.PI) / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeSector(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle)
  const end = polarToCartesian(cx, cy, r, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`
}

function luminanceFromHex(hex) {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return 0
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function textColorForHex(hex) {
  return luminanceFromHex(hex) > 0.6 ? '#1A1B1C' : '#F7F2EA'
}

function drawWheel(items) {
  const group = elements.wheelGroup
  while (group.firstChild) group.removeChild(group.firstChild)

  const count = items.length
  const cx = 200
  const cy = 200
  const radius = 180

  if (count === 0) {
    const circle = document.createElementNS(svgNS, 'circle')
    circle.setAttribute('cx', cx)
    circle.setAttribute('cy', cy)
    circle.setAttribute('r', radius)
    circle.setAttribute('fill', '#E7DFD4')
    circle.setAttribute('stroke', '#CABFAF')
    circle.setAttribute('stroke-width', '2')
    group.appendChild(circle)

    const text = document.createElementNS(svgNS, 'text')
    text.setAttribute('x', cx)
    text.setAttribute('y', cy)
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'middle')
    text.setAttribute('fill', '#6B625A')
    text.setAttribute('font-size', '16')
    text.textContent = '候補がありません'
    group.appendChild(text)
    return
  }

  const segmentAngle = 360 / count
  const fontSize = Math.max(8, Math.min(18, 22 - Math.floor(count / 6)))

  items.forEach((item, index) => {
    const startAngle = segmentAngle * index
    const endAngle = startAngle + segmentAngle
    const color = palette[index % palette.length]
    const path = document.createElementNS(svgNS, 'path')
    path.setAttribute('d', describeSector(cx, cy, radius, startAngle, endAngle))
    path.setAttribute('fill', color)
    path.setAttribute('stroke', '#F4EEE4')
    path.setAttribute('stroke-width', '1')
    group.appendChild(path)

    const midAngle = startAngle + segmentAngle / 2
    const labelRadius = radius * 0.62
    const point = polarToCartesian(cx, cy, labelRadius, midAngle)
    const label = document.createElementNS(svgNS, 'text')
    label.setAttribute('x', point.x)
    label.setAttribute('y', point.y)
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dominant-baseline', 'middle')
    label.setAttribute('font-size', String(fontSize))
    label.setAttribute('fill', textColorForHex(color))

    let labelRotation = midAngle
    if (labelRotation > 90 && labelRotation < 270) {
      labelRotation += 180
    }
    label.setAttribute('transform', `rotate(${labelRotation} ${point.x} ${point.y})`)

    const maxLen = 12
    let labelText = item
    if (labelText.length > maxLen) {
      labelText = `${labelText.slice(0, maxLen - 3)}...`
    }
    label.textContent = labelText
    group.appendChild(label)
  })

  const ring = document.createElementNS(svgNS, 'circle')
  ring.setAttribute('cx', cx)
  ring.setAttribute('cy', cy)
  ring.setAttribute('r', radius)
  ring.setAttribute('fill', 'none')
  ring.setAttribute('stroke', '#3C3732')
  ring.setAttribute('stroke-width', '2')
  group.appendChild(ring)
}

function setWheelRotation(angle) {
  elements.wheelGroup.style.transform = `rotate(${angle}deg)`
}

function updateCounts() {
  const available = getAvailableItems(state.items, state.excluded)
  elements.candidateCount.textContent = String(available.length)
}

function updateErrors() {
  const available = getAvailableItems(state.items, state.excluded)
  const errors = []

  if (state.items.length === 0) {
    errors.push('候補が0件です。入力してください。')
  }
  if (state.items.length > MAX_ITEMS) {
    errors.push(`候補が${MAX_ITEMS + 1}件以上です。100件以内にしてください。`)
  }
  if (state.items.length > 0 && available.length === 0) {
    errors.push('全候補が除外されています。リセットしてください。')
  }
  if (!window.crypto || !window.crypto.getRandomValues) {
    errors.push('Web Crypto APIが利用できないため抽選できません。')
  }

  if (errors.length) {
    elements.errorBox.innerHTML = errors.map((error) => `<p>${error}</p>`).join('')
  } else {
    elements.errorBox.innerHTML = ''
  }

  return errors.length === 0
}

function updateResultPanel() {
  elements.resultPanel.hidden = !state.showResult
  if (state.showResult && state.lastWinner != null) {
    const winner = state.lastWinner
    const suffix = winner.endsWith('さん') ? '' : 'さん'
    elements.resultText.textContent = ''
    elements.resultText.appendChild(document.createTextNode(winner))
    if (suffix) {
      const honorific = document.createElement('span')
      honorific.className = 'result-honorific'
      honorific.textContent = suffix
      elements.resultText.appendChild(honorific)
    }
  }
}

function updatePanelState() {
  elements.controlPanel.classList.toggle('is-collapsed', state.panelCollapsed)
}

function updateUI() {
  updateCounts()
  updateErrors()
  updateResultPanel()
  updatePanelState()

  elements.spinBtn.disabled = state.spinning
  elements.resetBtn.disabled = state.spinning
  elements.candidateInput.disabled = state.spinning
  elements.excludeToggle.checked = state.excludeWinners
  elements.excludeToggle.disabled = state.spinning
  elements.wheelWrap.classList.toggle('is-spinning', state.spinning)
  elements.wheelGuide.hidden = !state.showGuide
  elements.wheelWrap.setAttribute('aria-disabled', String(state.spinning))
}

let inputDebounce = null

function applyInput() {
  if (state.spinning) return
  const nextItems = parseCandidates(elements.candidateInput.value)
  state.items = nextItems
  state.excluded = reconcileExcluded(state.items, state.excluded)
  state.pendingExclusions = reconcileExcluded(state.items, state.pendingExclusions)
  drawWheel(getAvailableItems(state.items, state.excluded))
  saveState()
  updateUI()
}

function handleReset() {
  if (state.spinning) return
  const ok = window.confirm('候補をリセットします。よろしいですか？')
  if (!ok) return
  state.items = []
  state.excluded = []
  state.pendingExclusions = []
  state.lastWinner = null
  state.showResult = false
  elements.candidateInput.value = ''
  drawWheel([])
  saveState()
  updateUI()
}

function showResult() {
  state.showResult = true
  updateUI()
}

function handleSpin() {
  if (state.spinning) return
  if (state.excludeWinners && state.pendingExclusions.length) {
    state.excluded = reconcileExcluded(
      state.items,
      state.excluded.concat(state.pendingExclusions),
    )
    state.pendingExclusions = []
    drawWheel(getAvailableItems(state.items, state.excluded))
    setWheelRotation(state.rotation)
    saveState()
  }
  const canSpin = updateErrors()
  if (!canSpin) return
  const available = getAvailableItems(state.items, state.excluded)
  if (available.length === 0) return

  let winnerIndex = 0
  try {
    winnerIndex = cryptoRandomInt(available.length)
  } catch (error) {
    updateUI()
    return
  }

  const winner = available[winnerIndex]
  state.lastWinner = winner
  state.showResult = false

  const segmentAngle = 360 / available.length
  const centerAngle = segmentAngle * winnerIndex + segmentAngle / 2
  const offset = randomBetween(-segmentAngle * 0.2, segmentAngle * 0.2)

  const current = normalizeAngle(state.rotation)
  const desired = normalizeAngle(-centerAngle - offset)
  const delta = (desired - current + 360) % 360
  const spins = randomIntBetween(5, 12)
  const duration = prefersReducedMotion ? 500 : randomBetween(3500, 6000)
  const target = state.rotation + spins * 360 + delta

  state.spinning = true
  state.showGuide = false
  updateUI()

  const startRotation = state.rotation
  const startTime = performance.now()

  const animate = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const value = startRotation + (target - startRotation) * eased
    setWheelRotation(value)

    if (progress < 1) {
      window.requestAnimationFrame(animate)
    } else {
      state.rotation = target
      state.spinning = false
      if (state.excludeWinners) {
        state.pendingExclusions.push(winner)
        state.pendingExclusions = reconcileExcluded(state.items, state.pendingExclusions)
        saveState()
      }
      showResult()
    }
  }

  window.requestAnimationFrame(animate)
}

function handlePanelToggle() {
  state.panelCollapsed = !state.panelCollapsed
  updateUI()
}

function handleKeydown(event) {
  const tag = event.target.tagName.toLowerCase()
  const isTyping = tag === 'textarea' || tag === 'input'

  if (isTyping && event.key.toLowerCase() !== 'escape') return

  switch (event.key.toLowerCase()) {
    case ' ':
    case 'spacebar':
      event.preventDefault()
      handleSpin()
      break
    case 'x':
      if (state.showResult) {
        state.showResult = false
        updateUI()
      }
      break
    case 'r':
      handleReset()
      break
    default:
      break
  }
}

function init() {
  loadState()
  elements.appTitle.textContent = APP_TITLE
  elements.candidateInput.value = state.items.join('\n')

  if (!state.excludeWinners) {
    state.excluded = []
    state.pendingExclusions = []
  }
  state.excluded = reconcileExcluded(state.items, state.excluded)
  state.pendingExclusions = reconcileExcluded(state.items, state.pendingExclusions)
  drawWheel(getAvailableItems(state.items, state.excluded))
  setWheelRotation(state.rotation)
  updateUI()
}

// Event bindings

elements.wheelWrap.addEventListener('click', () => {
  if (state.spinning) return
  handleSpin()
})

elements.wheelWrap.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleSpin()
  }
})

elements.spinBtn.addEventListener('click', handleSpin)

elements.resetBtn.addEventListener('click', handleReset)

elements.candidateInput.addEventListener('input', () => {
  if (inputDebounce) window.clearTimeout(inputDebounce)
  inputDebounce = window.setTimeout(applyInput, 300)
})

elements.candidateInput.addEventListener('blur', () => {
  if (inputDebounce) window.clearTimeout(inputDebounce)
  applyInput()
})

elements.excludeToggle.addEventListener('change', () => {
  state.excludeWinners = elements.excludeToggle.checked
  if (!state.excludeWinners) {
    state.excluded = []
    state.pendingExclusions = []
    drawWheel(getAvailableItems(state.items, state.excluded))
    setWheelRotation(state.rotation)
  }
  saveState()
  updateUI()
})

elements.clearResultBtn.addEventListener('click', () => {
  state.showResult = false
  updateUI()
})

elements.wheelGuide.addEventListener('click', () => {
  state.showGuide = false
  updateUI()
})

document.addEventListener('keydown', handleKeydown)

elements.panelToggle.addEventListener('click', handlePanelToggle)

init()
