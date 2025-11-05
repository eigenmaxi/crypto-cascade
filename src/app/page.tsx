'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import sdk from '@farcaster/frame-sdk'

type TokenType = 'ETH' | 'BTC' | 'USDC' | 'MATIC' | 'BASE' | 'WETH'

interface Token {
  id: string
  type: TokenType
  row: number
  col: number
  isMatched: boolean
  isFalling: boolean
}

interface CascadeState {
  grid: (Token | null)[][]
  score: number
  moves: number
  level: number
  targetScore: number
  gameStatus: 'menu' | 'playing' | 'levelComplete' | 'gameOver'
  cascadeCombo: number
  selectedToken: { row: number; col: number } | null
  isProcessing: boolean
}

const GRID_SIZE: number = 8
const TOKEN_TYPES: TokenType[] = ['ETH', 'BTC', 'USDC', 'MATIC', 'BASE', 'WETH']
const INITIAL_MOVES: number = 20

const TOKEN_COLORS: Record<TokenType, string> = {
  ETH: 'bg-gradient-to-br from-purple-400 to-purple-600',
  BTC: 'bg-gradient-to-br from-orange-400 to-orange-600',
  USDC: 'bg-gradient-to-br from-blue-400 to-blue-600',
  MATIC: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
  BASE: 'bg-gradient-to-br from-blue-500 to-blue-700',
  WETH: 'bg-gradient-to-br from-pink-400 to-pink-600',
}

const TOKEN_SYMBOLS: Record<TokenType, string> = {
  ETH: 'Ξ',
  BTC: '₿',
  USDC: '$',
  MATIC: '◇',
  BASE: '⬡',
  WETH: 'W',
}

export default function CryptoCascade(): JSX.Element {
  const [cascadeState, setCascadeState] = useState<CascadeState>({
    grid: [],
    score: 0,
    moves: INITIAL_MOVES,
    level: 1,
    targetScore: 1000,
    gameStatus: 'menu',
    cascadeCombo: 0,
    selectedToken: null,
    isProcessing: false,
  })

  const [isMuted, setIsMuted] = useState<boolean>(false)
  const [isSDKLoaded, setIsSDKLoaded] = useState<boolean>(false)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async (): Promise<void> => {
      try {
        await sdk.actions.ready()
        setIsSDKLoaded(true)
        console.log('Farcaster SDK loaded successfully')
      } catch (error) {
        console.error('Failed to load Farcaster SDK:', error)
        setIsSDKLoaded(true) // Continue anyway for non-Farcaster environments
      }
    }

    initSDK()
  }, [])

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }, [])

  // Play sound effect
  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine'): void => {
    if (isMuted || !audioContextRef.current) return

    const oscillator: OscillatorNode = audioContextRef.current.createOscillator()
    const gainNode: GainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }, [isMuted])

  // Sound effects
  const sounds = {
    swap: (): void => playSound(400, 0.1, 'sine'),
    cascade: (): void => {
      playSound(600, 0.15, 'square')
      setTimeout(() => playSound(800, 0.1, 'square'), 50)
    },
    comboMultiplier: (comboLevel: number): void => {
      const baseFreq: number = 700
      for (let i: number = 0; i < comboLevel; i++) {
        setTimeout(() => playSound(baseFreq + i * 100, 0.1, 'triangle'), i * 50)
      }
    },
    levelComplete: (): void => {
      const notes: number[] = [523, 659, 784, 1047]
      notes.forEach((note: number, index: number) => {
        setTimeout(() => playSound(note, 0.2, 'sine'), index * 100)
      })
    },
    gameOver: (): void => {
      playSound(400, 0.3, 'sawtooth')
      setTimeout(() => playSound(300, 0.4, 'sawtooth'), 150)
    },
  }

  // Initialize grid
  const createInitialGrid = useCallback((): (Token | null)[][] => {
    const grid: (Token | null)[][] = []
    for (let row: number = 0; row < GRID_SIZE; row++) {
      grid[row] = []
      for (let col: number = 0; col < GRID_SIZE; col++) {
        const type: TokenType = TOKEN_TYPES[Math.floor(Math.random() * TOKEN_TYPES.length)]
        grid[row][col] = {
          id: `${row}-${col}-${Date.now()}-${Math.random()}`,
          type,
          row,
          col,
          isMatched: false,
          isFalling: false,
        }
      }
    }
    return grid
  }, [])

  // Find matches in the grid
  const findMatches = useCallback((grid: (Token | null)[][]): { row: number; col: number }[] => {
    const matches: { row: number; col: number }[] = []
    const matched: Set<string> = new Set()

    // Check horizontal matches
    for (let row: number = 0; row < GRID_SIZE; row++) {
      for (let col: number = 0; col < GRID_SIZE - 2; col++) {
        const token1: Token | null = grid[row][col]
        const token2: Token | null = grid[row][col + 1]
        const token3: Token | null = grid[row][col + 2]

        if (token1 && token2 && token3 && token1.type === token2.type && token2.type === token3.type) {
          matched.add(`${row}-${col}`)
          matched.add(`${row}-${col + 1}`)
          matched.add(`${row}-${col + 2}`)
        }
      }
    }

    // Check vertical matches
    for (let col: number = 0; col < GRID_SIZE; col++) {
      for (let row: number = 0; row < GRID_SIZE - 2; row++) {
        const token1: Token | null = grid[row][col]
        const token2: Token | null = grid[row + 1][col]
        const token3: Token | null = grid[row + 2][col]

        if (token1 && token2 && token3 && token1.type === token2.type && token2.type === token3.type) {
          matched.add(`${row}-${col}`)
          matched.add(`${row + 1}-${col}`)
          matched.add(`${row + 2}-${col}`)
        }
      }
    }

    matched.forEach((key: string) => {
      const [row, col] = key.split('-').map(Number)
      matches.push({ row, col })
    })

    return matches
  }, [])

  // Remove matched tokens and apply gravity (cascade effect)
  const processCascade = useCallback(async (grid: (Token | null)[][]): Promise<{ newGrid: (Token | null)[][]; matchCount: number }> => {
    const matches: { row: number; col: number }[] = findMatches(grid)

    if (matches.length === 0) {
      return { newGrid: grid, matchCount: 0 }
    }

    // Mark matched tokens
    const newGrid: (Token | null)[][] = grid.map((row: (Token | null)[]) => [...row])
    matches.forEach(({ row, col }: { row: number; col: number }) => {
      newGrid[row][col] = null
    })

    // Apply gravity - tokens cascade down
    for (let col: number = 0; col < GRID_SIZE; col++) {
      let emptyRow: number = GRID_SIZE - 1
      for (let row: number = GRID_SIZE - 1; row >= 0; row--) {
        if (newGrid[row][col] !== null) {
          if (row !== emptyRow) {
            newGrid[emptyRow][col] = { ...newGrid[row][col]!, row: emptyRow, col }
            newGrid[row][col] = null
          }
          emptyRow--
        }
      }

      // Fill empty spaces with new tokens cascading from top
      for (let row: number = emptyRow; row >= 0; row--) {
        const type: TokenType = TOKEN_TYPES[Math.floor(Math.random() * TOKEN_TYPES.length)]
        newGrid[row][col] = {
          id: `${row}-${col}-${Date.now()}-${Math.random()}`,
          type,
          row,
          col,
          isMatched: false,
          isFalling: true,
        }
      }
    }

    return { newGrid, matchCount: matches.length }
  }, [findMatches])

  // Process all cascading matches
  const processCascadingMatches = useCallback(async (initialGrid: (Token | null)[][]): Promise<void> => {
    let grid: (Token | null)[][] = initialGrid
    let cascadeCombo: number = 0
    let totalScore: number = 0

    while (true) {
      const { newGrid, matchCount } = await processCascade(grid)
      
      if (matchCount === 0) break

      grid = newGrid
      cascadeCombo++
      const comboMultiplier: number = cascadeCombo
      const scoreGain: number = matchCount * 10 * comboMultiplier
      totalScore += scoreGain

      sounds.cascade()
      if (cascadeCombo > 1) {
        sounds.comboMultiplier(cascadeCombo)
      }

      await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 300))
    }

    setCascadeState((prev: CascadeState) => {
      const newScore: number = prev.score + totalScore
      let newStatus: CascadeState['gameStatus'] = prev.gameStatus
      let newLevel: number = prev.level
      let newTargetScore: number = prev.targetScore
      let newMoves: number = prev.moves

      if (newScore >= prev.targetScore && prev.gameStatus === 'playing') {
        newStatus = 'levelComplete'
        newLevel = prev.level + 1
        newTargetScore = prev.targetScore * 1.5
        newMoves = INITIAL_MOVES
        sounds.levelComplete()
      }

      return {
        ...prev,
        grid,
        score: newScore,
        cascadeCombo: totalScore > 0 ? cascadeCombo : 0,
        isProcessing: false,
        gameStatus: newStatus,
        level: newLevel,
        targetScore: Math.floor(newTargetScore),
        moves: newMoves,
      }
    })
  }, [processCascade, sounds])

  // Handle token selection and swap
  const handleTokenClick = useCallback((row: number, col: number): void => {
    if (cascadeState.isProcessing || cascadeState.gameStatus !== 'playing') return

    const { selectedToken } = cascadeState

    if (!selectedToken) {
      setCascadeState((prev: CascadeState) => ({ ...prev, selectedToken: { row, col } }))
      sounds.swap()
    } else {
      const rowDiff: number = Math.abs(selectedToken.row - row)
      const colDiff: number = Math.abs(selectedToken.col - col)
      const isAdjacent: boolean = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)

      if (isAdjacent) {
        setCascadeState((prev: CascadeState) => {
          const newGrid: (Token | null)[][] = prev.grid.map((r: (Token | null)[]) => [...r])
          const temp: Token | null = newGrid[row][col]
          newGrid[row][col] = newGrid[selectedToken.row][selectedToken.col]
          newGrid[selectedToken.row][selectedToken.col] = temp

          if (newGrid[row][col]) {
            newGrid[row][col] = { ...newGrid[row][col]!, row, col }
          }
          if (newGrid[selectedToken.row][selectedToken.col]) {
            newGrid[selectedToken.row][selectedToken.col] = {
              ...newGrid[selectedToken.row][selectedToken.col]!,
              row: selectedToken.row,
              col: selectedToken.col,
            }
          }

          const matches: { row: number; col: number }[] = findMatches(newGrid)

          if (matches.length > 0) {
            sounds.swap()
            setTimeout(() => processCascadingMatches(newGrid), 100)

            const newMoves: number = prev.moves - 1
            const newStatus: CascadeState['gameStatus'] = newMoves <= 0 && prev.score < prev.targetScore ? 'gameOver' : prev.gameStatus

            if (newStatus === 'gameOver') {
              sounds.gameOver()
            }

            return {
              ...prev,
              grid: newGrid,
              selectedToken: null,
              isProcessing: true,
              moves: newMoves,
              gameStatus: newStatus,
            }
          } else {
            // Swap back if no matches
            return { ...prev, selectedToken: null }
          }
        })
      } else {
        setCascadeState((prev: CascadeState) => ({ ...prev, selectedToken: { row, col } }))
        sounds.swap()
      }
    }
  }, [cascadeState, findMatches, processCascadingMatches, sounds])

  // Start game
  const startGame = useCallback((): void => {
    const grid: (Token | null)[][] = createInitialGrid()
    setCascadeState({
      grid,
      score: 0,
      moves: INITIAL_MOVES,
      level: 1,
      targetScore: 1000,
      gameStatus: 'playing',
      cascadeCombo: 0,
      selectedToken: null,
      isProcessing: false,
    })
  }, [createInitialGrid])

  // Next level
  const nextLevel = useCallback((): void => {
    const grid: (Token | null)[][] = createInitialGrid()
    setCascadeState((prev: CascadeState) => ({
      ...prev,
      grid,
      gameStatus: 'playing',
      moves: INITIAL_MOVES,
      cascadeCombo: 0,
      selectedToken: null,
      isProcessing: false,
    }))
  }, [createInitialGrid])

  // Show loading state while SDK initializes
  if (!isSDKLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌊</div>
          <div className="text-white text-xl font-bold">Loading Crypto Cascade...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col items-center justify-center p-4 pt-16">
      {/* Header */}
      <div className="w-full max-w-2xl mb-4">
        <h1 className="text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 mb-2 drop-shadow-2xl tracking-tight">
          🌊 CRYPTO CASCADE
        </h1>
        <p className="text-center text-cyan-200 text-sm font-medium">Trigger cascading combos • Match crypto tokens • Build your chain!</p>
      </div>

      {/* Game Stats */}
      {cascadeState.gameStatus === 'playing' && (
        <div className="w-full max-w-2xl bg-black/40 backdrop-blur-md rounded-xl p-4 mb-4 border border-cyan-500/20">
          <div className="grid grid-cols-4 gap-4 text-white text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-300">{cascadeState.level}</div>
              <div className="text-xs text-gray-400">Level</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-300">{cascadeState.score}</div>
              <div className="text-xs text-gray-400">Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-300">{cascadeState.moves}</div>
              <div className="text-xs text-gray-400">Moves</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-300">{cascadeState.cascadeCombo}x</div>
              <div className="text-xs text-gray-400">Cascade</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Chain Target</span>
              <span>{cascadeState.targetScore}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
              <div
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-full transition-all duration-300 shadow-lg shadow-blue-500/50"
                style={{ width: `${Math.min((cascadeState.score / cascadeState.targetScore) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Grid */}
      {cascadeState.gameStatus === 'playing' && (
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-cyan-500/30">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}>
            {cascadeState.grid.map((row: (Token | null)[], rowIndex: number) =>
              row.map((token: Token | null, colIndex: number) => {
                if (!token) return <div key={`${rowIndex}-${colIndex}`} className="w-12 h-12" />
                
                const isSelected: boolean = cascadeState.selectedToken?.row === rowIndex && cascadeState.selectedToken?.col === colIndex

                return (
                  <button
                    key={token.id}
                    onClick={() => handleTokenClick(rowIndex, colIndex)}
                    className={`w-12 h-12 rounded-lg font-bold text-2xl text-white shadow-lg transform transition-all duration-200 hover:scale-110 active:scale-95 border-2 border-white/20 ${
                      TOKEN_COLORS[token.type as keyof typeof TOKEN_COLORS]
                    } ${isSelected ? 'ring-4 ring-yellow-400 scale-110 shadow-yellow-400/50' : ''}`}
                  >
                    {TOKEN_SYMBOLS[token.type as keyof typeof TOKEN_SYMBOLS]}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Menu Screen */}
      {cascadeState.gameStatus === 'menu' && (
        <div className="bg-black/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-white text-center max-w-md border border-cyan-500/30">
          <h2 className="text-3xl font-bold mb-4 text-cyan-300">🎮 Welcome to Crypto Cascade!</h2>
          <p className="mb-6 text-gray-300 leading-relaxed">
            Swap adjacent crypto tokens to match 3 or more. Watch them cascade down and trigger epic combo chains!
          </p>
          <div className="space-y-3 mb-6 text-left text-sm bg-black/40 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌊</span>
              <span>Trigger cascades for massive combos</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">Ξ</span>
              <span>Match crypto tokens to score points</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⛓️</span>
              <span>Build chains before moves run out</span>
            </div>
          </div>
          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/50"
          >
            Start Cascading
          </button>
        </div>
      )}

      {/* Level Complete Screen */}
      {cascadeState.gameStatus === 'levelComplete' && (
        <div className="bg-black/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-white text-center max-w-md border border-green-500/30">
          <h2 className="text-3xl font-bold mb-4 text-green-300">🌊 Cascade Complete!</h2>
          <div className="space-y-2 mb-6">
            <p className="text-xl">Score: <span className="font-bold text-yellow-400">{cascadeState.score}</span></p>
            <p className="text-xl">Level: <span className="font-bold text-cyan-400">{cascadeState.level - 1}</span></p>
            <p className="text-sm text-gray-400">Keep the cascade flowing!</p>
          </div>
          <button
            onClick={nextLevel}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-lg transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-green-500/50"
          >
            Next Cascade
          </button>
        </div>
      )}

      {/* Game Over Screen */}
      {cascadeState.gameStatus === 'gameOver' && (
        <div className="bg-black/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl text-white text-center max-w-md border border-red-500/30">
          <h2 className="text-3xl font-bold mb-4 text-red-300">💀 Cascade Collapsed</h2>
          <div className="space-y-2 mb-6">
            <p className="text-xl">Final Score: <span className="font-bold text-yellow-400">{cascadeState.score}</span></p>
            <p className="text-xl">Level Reached: <span className="font-bold text-cyan-400">{cascadeState.level}</span></p>
            <p className="text-sm text-gray-400">The chain has broken...</p>
          </div>
          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/50"
          >
            Restart Cascade
          </button>
        </div>
      )}

      {/* Audio Control */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="fixed top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50 border border-cyan-500/30"
        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}