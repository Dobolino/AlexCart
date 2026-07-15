import './style.css'
import { Game } from './game/Game'

const canvas = document.getElementById('game') as HTMLCanvasElement
const menu = document.getElementById('menu')!
const gameover = document.getElementById('gameover')!
const hud = document.getElementById('hud')!
const btnStart = document.getElementById('btn-start')!
const btnRetry = document.getElementById('btn-retry')!
const btnMenu = document.getElementById('btn-menu')!

const scoreEl = document.getElementById('score')!
const speedEl = document.getElementById('speed')!
const comboEl = document.getElementById('combo')!
const trickEl = document.getElementById('trick-banner')!
const leftPad = document.getElementById('left-pad')!
const rightPad = document.getElementById('right-pad')!
const airHint = document.getElementById('air-hint')!
const finalScore = document.getElementById('final-score')!
const finalMeta = document.getElementById('final-meta')!
const goTitle = document.getElementById('go-title')!

const game = new Game(canvas)

function showMenu(): void {
  menu.classList.remove('hidden')
  gameover.classList.add('hidden')
  hud.classList.add('hidden')
  game.beginIdle()
}

function showPlaying(): void {
  menu.classList.add('hidden')
  gameover.classList.add('hidden')
  hud.classList.remove('hidden')
  game.start()
}

function showGameOver(crashed: boolean, score: number, meta: string, best: string): void {
  gameover.classList.remove('hidden')
  hud.classList.add('hidden')
  goTitle.textContent = crashed ? 'Crash!' : 'Ziel erreicht'
  finalScore.textContent = String(score)
  finalMeta.textContent = best ? `${meta} · Best: ${best}` : meta
}

let gameOverShown = false

game.onHudUpdate((h) => {
  scoreEl.textContent = String(h.score)
  speedEl.textContent = String(h.speedKmh)
  comboEl.textContent = `×${h.combo % 1 === 0 ? h.combo : h.combo.toFixed(1)}`
  airHint.textContent = h.airHint
  leftPad.classList.toggle('active', h.leftActive)
  rightPad.classList.toggle('active', h.rightActive)

  if (h.trickBanner) {
    trickEl.textContent = h.trickBanner
    trickEl.classList.add('show')
  } else {
    trickEl.classList.remove('show')
  }

  if (h.phase === 'finished' && !gameOverShown) {
    gameOverShown = true
    const crashed = !game.skier.state.alive
    showGameOver(crashed, h.score, h.finalMeta, h.bestTrick)
  }
})

btnStart.addEventListener('click', () => {
  gameOverShown = false
  showPlaying()
})
btnRetry.addEventListener('click', () => {
  gameOverShown = false
  showPlaying()
})
btnMenu.addEventListener('click', () => {
  gameOverShown = false
  showMenu()
})

showMenu()
