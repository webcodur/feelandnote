import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { Link } from 'react-router-dom'

class DemoScene extends Phaser.Scene {
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private stars!: Phaser.Physics.Arcade.Group
  private scoreText!: Phaser.GameObjects.Text
  private score = 0

  constructor() {
    super('demo')
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e')

    // Platforms
    this.platforms = this.physics.add.staticGroup()
    const ground = this.add.rectangle(400, 580, 800, 40, 0x333355)
    this.platforms.add(ground)
    this.physics.add.existing(ground, true)

    const plat1 = this.add.rectangle(600, 400, 200, 20, 0x333355)
    this.platforms.add(plat1)
    this.physics.add.existing(plat1, true)

    const plat2 = this.add.rectangle(200, 300, 200, 20, 0x333355)
    this.platforms.add(plat2)
    this.physics.add.existing(plat2, true)

    const plat3 = this.add.rectangle(500, 200, 200, 20, 0x333355)
    this.platforms.add(plat3)
    this.physics.add.existing(plat3, true)

    // Player (simple rectangle)
    const playerRect = this.add.rectangle(100, 500, 32, 32, 0x4488ff)
    this.player = this.physics.add.existing(playerRect, false) as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
    this.player.body.setBounce(0.2)
    this.player.body.setCollideWorldBounds(true)

    this.physics.add.collider(this.player, this.platforms)

    // Stars
    this.stars = this.physics.add.group()
    for (let i = 0; i < 10; i++) {
      const star = this.add.circle(80 + i * 70, 10, 8, 0xffdd44)
      this.stars.add(star)
      const body = star.body as Phaser.Physics.Arcade.Body
      body.setBounce(Phaser.Math.FloatBetween(0.3, 0.6))
    }
    this.physics.add.collider(this.stars, this.platforms)
    this.physics.add.overlap(this.player, this.stars, (_, star) => {
      (star as Phaser.GameObjects.Arc).destroy()
      this.score += 10
      this.scoreText.setText(`Score: ${this.score}`)
    })

    // Score
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '18px', color: '#eee' })

    // Controls
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Instructions
    this.add.text(16, 44, '방향키로 이동, 위로 점프', { fontSize: '13px', color: '#666' })
  }

  update() {
    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-200)
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(200)
    } else {
      this.player.body.setVelocityX(0)
    }

    if (this.cursors.up.isDown && this.player.body.touching.down) {
      this.player.body.setVelocityY(-400)
    }
  }
}

export function PhaserTest() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: containerRef.current,
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 500 }, debug: false },
      },
      scene: DemoScene,
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Link to="/" style={{ position: 'fixed', top: 12, left: 16, color: '#999', zIndex: 10, textDecoration: 'none', fontSize: 14 }}>
        ← Back
      </Link>
      <div ref={containerRef} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #333' }} />
    </div>
  )
}
