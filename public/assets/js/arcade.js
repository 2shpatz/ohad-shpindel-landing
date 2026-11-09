/* ==================== ARCADE ====================
 * A retro layer over the site:
 *   - a small cast of 8-bit characters that stroll, drift down, peek out from
 *     behind tabs and cards, and turn to look at the visitor or at a click
 *   - a hammer tool that smashes words into pixels, and puts them back
 *
 * All sprites are ORIGINAL art stored as pixel grids in this file - no image
 * files, no external requests, and no trademarked game characters.
 *
 * Two canvases:
 *   .arcade-bg  z-index -1  cast, painted BEHIND page text (that's the "peek")
 *   .arcade-fx  z-index 400 hammer debris, painted above everything
 *
 * prefers-reduced-motion: the whole feature is motion, so it is not built at
 * all - no canvases, no controls, no loop.
 * ================================================ */

const Arcade = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ---------- palette (drawn from tokens.css so the cast belongs here) ---------- */

  // Only the brand colours live here; each character's own colours are game
  // colours and stay in its sprite grid. METAL, DARK and GINGER used to sit here
  // unreferenced and named a palette the site no longer uses, so they're gone.
  const LIGHT = '#f5d5e0';        // --text-primary
  const ACCENT = '#c874b2';       // --accent-secondary

  /* ---------- the cast ----------
   * Familiar arcade archetypes from the late 70s / early 80s, hand-drawn here
   * as pixel grids. Each row is one pixel row; every character indexes `pal`,
   * '0' = transparent. Rows must all be `w` characters long - buildSprite()
   * throws on a mismatch rather than drawing something broken.
   *
   * NOTE: these designs are recognisable on purpose, at the site owner's
   * explicit request. The originals are live trademarks of Bandai Namco,
   * Taito and Nintendo. Swapping any entry here for an original design is a
   * one-object change and needs no other edits. */

  /* The ghosts' two frames differ only in the skirt: the fringe alternates
   * between four tabs and three, which is what makes them look like they're
   * flowing rather than sliding. The pupils sit on the right of each eye, so
   * mirroring the sprite for a leftward walk also makes them look where they're
   * going - no separate per-direction frames needed. */
  const GHOST_BODY = [
    '00011111000',
    '00111111100',
    '01111111110',
    '11221112211',
    '11231112311',
    '11221112211',
    '11111111111',
    '11111111111',
    '11111111111',
  ];

  const GHOST_FRAMES = [
    [...GHOST_BODY, '11011011011'],
    [...GHOST_BODY, '01101110110'],
  ];

  const SPRITES = {
    // Maze-chase ghosts - same shape, two colourways.
    ghostPink: { w: 11, h: 10, pal: ['', '#ff7ab8', '#ffffff', '#2b2b6b'], frames: GHOST_FRAMES },
    ghostCyan: { w: 11, h: 10, pal: ['', '#69e0ef', '#ffffff', '#2b2b6b'], frames: GHOST_FRAMES },

    // The dot-muncher. Frames 0-2 are the chomp cycle (shut, half, wide); 3-8
    // are the death, played once when a hammer catches it: the mouth keeps
    // opening past the body until only a spark is left, and sparkle() finishes
    // the job. Traced from the reference GIF that shipped with these frames.
    // The grid is 13 wide though the body is 11, so the collapsed crescent in
    // frame 6 can spread wider than the mouth-shut circle.
    muncher: {
      w: 13, h: 11, pal: ['', '#ffd93d'],
      frames: [
        [ // 0 - shut
          '0000111110000',
          '0001111111000',
          '0011111111100',
          '0111111111110',
          '0111111111110',
          '0111110000000',
          '0111111111110',
          '0111111111110',
          '0011111111100',
          '0001111111000',
          '0000111110000',
        ],
        [ // 1 - half open
          '0000111110000',
          '0001111111000',
          '0011111111100',
          '0111111111100',
          '0111111110000',
          '0111110000000',
          '0111111110000',
          '0111111111100',
          '0011111111100',
          '0001111111000',
          '0000111110000',
        ],
        [ // 2 - wide open
          '0000111110000',
          '0001111111000',
          '0011111110000',
          '0111111100000',
          '0111111000000',
          '0111110000000',
          '0111111000000',
          '0111111100000',
          '0011111110000',
          '0001111111000',
          '0000111110000',
        ],
        [ // 3 - death: the mouth swings up and the crown splits
          '0000000000000',
          '0001100011000',
          '0011110111100',
          '0111110111110',
          '0111110111110',
          '0111111111110',
          '0111111111110',
          '0111111111110',
          '0011111111100',
          '0001111111000',
          '0000111110000',
        ],
        [ // 4 - death: gap widening, horns shrinking
          '0000000000000',
          '0000000000000',
          '0011000001100',
          '0111100011110',
          '0111110111110',
          '0111111111110',
          '0111111111110',
          '0111111111110',
          '0011111111100',
          '0001111111000',
          '0000111110000',
        ],
        [ // 5 - death: horns almost gone
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0111000001110',
          '0111111111110',
          '0111111111110',
          '0111111111110',
          '0011111111100',
          '0001111111000',
          '0000111110000',
        ],
        [ // 6 - death: opened past itself, a flat crescent
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0011111111100',
          '0111111111110',
          '0011111111100',
          '0001111111000',
          '0000111110000',
        ],
        [ // 7 - death: a sliver
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0001111111000',
          '0000111110000',
        ],
        [ // 8 - death: the spark it goes out on
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000000000000',
          '0000001000000',
          '0000001000000',
          '0000001000000',
          '0000001000000',
          '0000001000000',
          '0000001000000',
        ],
      ],
    },

    // Descending crab alien. Two frames, arms down then arms up - the invaders
    // flip on every step of the march rather than animating smoothly.
    invader: {
      w: 11, h: 8, pal: ['', '#7ee081'],
      frames: [
        [ // arms down
          '00100000100',
          '00010001000',
          '00111111100',
          '01101110110',
          '11111111111',
          '10111111101',
          '10100000101',
          '00011011000',
        ],
        [ // arms up
          '00100000100',
          '10010001001',
          '10111111101',
          '11101110111',
          '11111111111',
          '01111111110',
          '00100000100',
          '01000000010',
        ],
      ],
    },

    /* Moustachioed jumping man, recovered from assets/img/plumber.gif. That file
     * is a sprite resampled at a non-integer scale, so the original grid was
     * refitted (scale 3.96) and each cell resampled: the result is the GIF's own
     * 15x21 art and its own 9 colours, not a redraw. The GIF holds just two
     * poses, 120ms each, so it becomes two frames alternating at that rate.
     * Frame 2 sits two rows higher - that lift is in the GIF, not a mistake. */
    plumber: {
      w: 15, h: 21,
      pal: ['', '#000000', '#f8e1d8', '#885718', '#f58567', '#315a90', '#500101', '#b02960', '#f84170', '#7fd7c8'],
      frames: [
        [ // stride, feet down
          '000000000000000',
          '000000666660000',
          '000066888486000',
          '000688774426000',
          '006787711111100',
          '067771111111110',
          '062111414140000',
          '623214212123300',
          '643211222222230',
          '614212214444430',
          '011442111111100',
          '001334441111000',
          '000673333500000',
          '006778559950000',
          '006333522925000',
          '003222322925000',
          '003223555995000',
          '003223555550000',
          '000333313100000',
          '000133341410000',
          '000111111110000',
        ],
        [ // stride, body lifted
          '000000666660000',
          '000066888486000',
          '000688774426000',
          '006787711111100',
          '067771111111110',
          '062111414140000',
          '623214212123300',
          '643211222222230',
          '614212214444430',
          '011442111111100',
          '001344441111000',
          '003733333500000',
          '003778359950000',
          '013222322925110',
          '133223522921411',
          '133223555951311',
          '135335555513110',
          '134105555013110',
          '011000000001100',
          '000000000000000',
          '000000000000000',
        ],
      ],
    },

    // Top-row squid - the small, fast one. Its legs tuck in and splay out.
    invaderSquid: {
      w: 8, h: 8, pal: ['', '#69e0ef'],
      frames: [
        [ // legs down
          '00011000',
          '00111100',
          '01111110',
          '11011011',
          '11111111',
          '00100100',
          '01011010',
          '10100101',
        ],
        [ // legs out
          '00011000',
          '00111100',
          '01111110',
          '11011011',
          '11111111',
          '01011010',
          '10000001',
          '01000010',
        ],
      ],
    },

    // Bottom-row octopus - the wide, slow one. Its tentacles swing in and out.
    invaderOcto: {
      w: 12, h: 8, pal: ['', '#ffb066'],
      frames: [
        [ // tentacles out
          '000011110000',
          '011111111110',
          '111111111111',
          '111001100111',
          '111111111111',
          '001110011100',
          '011001100110',
          '110000000011',
        ],
        [ // tentacles tucked
          '000011110000',
          '011111111110',
          '111111111111',
          '111001100111',
          '111111111111',
          '000110011000',
          '001101101100',
          '011000000110',
        ],
      ],
    },

    // The mystery ship that slides across the top for bonus points.
    ufo: {
      w: 13, h: 6, pal: ['', '#ff5f96', '#ffd93d'],
      rows: [
        '0000111110000',
        '0011111111100',
        '0111111111110',
        '1111111111111',
        '0112112112110',
        '0010000000100',
      ],
    },

    // Road-crossing frog.
    frog: {
      w: 11, h: 8, pal: ['', '#5cd65c', '#2d283e'],
      rows: [
        '01000000010',
        '01100000110',
        '01210001210',
        '00111111100',
        '01111111110',
        '11111111111',
        '11011111011',
        '11000000011',
      ],
    },

    // Player ship from the fixed shooters.
    ship: {
      w: 11, h: 8, pal: ['', LIGHT, ACCENT],
      rows: [
        '00000100000',
        '00001110000',
        '00011111000',
        '00111211100',
        '01111211110',
        '11111111111',
        '11011111011',
        '10000000001',
      ],
    },

    // ---- ground crew: these always patrol the bottom of the page ----

    // The alley cat. These five grids were traced automatically from the
    // game's own walk/sit frames (the source JPEGs were deleted once traced -
    // the grids below are the only copy). The cat was the only black in those
    // images, so an "all channels low" test isolated the silhouette; a
    // luminance test does not, since the magenta background sits at ~82.
    // All frames share one scale and are bottom/right-aligned, so the head
    // stays put while the legs and tail move and the cat never changes size.
    // Orange rather than the original's black, by request - and it reads far
    // better than black would on the dark #210535 background.
    // Frames 0-2 walk, 3-4 sit.
    cat: {
      w: 17, h: 9, pal: ['', '#f0913c'],
      frames: [
        [ // walk1
          '00000000000000000',
          '00100000000001100',
          '00010000000001110',
          '00110011110011111',
          '00011111111111110',
          '00001111111111110',
          '00001111111111100',
          '00011001100101100',
          '00010001101100100',
        ],
        [ // walk2
          '00000000000000000',
          '00000000000000000',
          '10000000000001100',
          '10000000110001110',
          '01100111111111111',
          '00111111111111110',
          '00011111000111100',
          '00011110000111100',
          '00011110000000110',
        ],
        [ // walk3
          '00000000000000000',
          '00000000000000000',
          '10000000000001100',
          '01100000111011110',
          '00110111111111111',
          '00011111111111110',
          '00001111111111000',
          '00000111000110000',
          '00000110000110000',
        ],
        [ // sit1
          '00000000000100110',
          '00000000000111110',
          '00000000001111111',
          '00000000000111110',
          '00000000000111100',
          '00000001001111110',
          '00000000111111110',
          '00000000011111110',
          '00000000011111101',
        ],
        [ // sit2
          '00000000000110110',
          '00000000000111110',
          '00000000001111111',
          '00000000000111110',
          '00000000000111100',
          '00000001111111110',
          '00000001011111110',
          '00000000011111110',
          '00000000011111111',
        ],
      ],
    },

    // The green-haired little worker. Frames 0-7 are the walk cycle, traced
    // from the sheet in assets/img: the sheet is a 3x3 of 8x12 cells on a 23px
    // pixel grid, and the eight distinct poses are the cycle (the ninth cell
    // repeats the first). Frames 8-9 are the umbrella float, played once it
    // walks off an edge.
    //
    // All ten frames share one 9x14 grid, bottom-aligned: the walker occupies
    // the lower ten rows and the top four are empty, which is exactly where the
    // canopy unfolds - so opening the umbrella never moves the body.
    // Colours are the sheet's own (green, skin, blue); the canopy is the site's
    // yellow rather than the sheet's pure #ffff00, which glares at this size.
    lemming: {
      w: 9, h: 14, pal: ['', '#00b000', '#f0d0d1', '#4040e0', '#ffd93d'],
      frames: [
        [ // 0 - walk
          '000000000',
          '000000000',
          '000000000',
          '000000000',
          '001111000',
          '001120000',
          '000222000',
          '000230000',
          '000230000',
          '000230000',
          '000330000',
          '002330000',
          '000220000',
          '000000000',
        ],
        [ // 1 - walk
          '000000000',
          '000000000',
          '000000000',
          '000101000',
          '001110000',
          '001120000',
          '000222000',
          '000230000',
          '002330000',
          '002330200',
          '000330200',
          '003302000',
          '002200000',
          '000000000',
        ],
        [ // 2 - walk
          '000000000',
          '000000000',
          '000000000',
          '000000000',
          '001010000',
          '001110000',
          '000120000',
          '000222000',
          '002230000',
          '002330000',
          '022333000',
          '003333000',
          '022002200',
          '000000000',
        ],
        [ // 3 - walk
          '000000000',
          '000000000',
          '000000000',
          '000000000',
          '000110000',
          '001121000',
          '001222000',
          '000230000',
          '000230000',
          '002330000',
          '000330000',
          '023333000',
          '020022000',
          '000000000',
        ],
        [ // 4 - walk
          '000000000',
          '000000000',
          '000000000',
          '000000000',
          '001111000',
          '001120000',
          '001222000',
          '000230000',
          '000320000',
          '000230000',
          '000330000',
          '002330000',
          '000220000',
          '000000000',
        ],
        [ // 5 - walk
          '000000000',
          '000000000',
          '000000000',
          '000101000',
          '001110000',
          '001120000',
          '000222000',
          '000230000',
          '000320000',
          '000320200',
          '000330200',
          '003302000',
          '002200000',
          '000000000',
        ],
        [ // 6 - walk
          '000000000',
          '000000000',
          '000000000',
          '000000000',
          '001010000',
          '001110000',
          '000120000',
          '000222000',
          '000320000',
          '000320000',
          '000332000',
          '003333000',
          '022002200',
          '000000000',
        ],
        [ // 7 - walk
          '000000000',
          '000000000',
          '000000000',
          '000000000',
          '000110000',
          '001121000',
          '001222000',
          '000230000',
          '000230000',
          '000320000',
          '000330000',
          '023333000',
          '020022000',
          '000000000',
        ],
        [ // 8 - float: canopy open, legs apart
          '000444000',
          '044444440',
          '444444444',
          '000030000',   // shaft - the gap that stops the canopy reading as a hat
          '000232000',   // hands gripping it
          '001111000',   // hair
          '001122000',
          '000222000',   // face
          '000333000',
          '000333000',
          '000333000',
          '000333000',
          '000303000',
          '002202200',
        ],
        [ // 9 - float: canopy flexed, tips curled, legs swung
          '000444000',
          '004444400',
          '444444444',
          '440030044',
          '000232000',
          '001111000',
          '001122000',
          '000222000',
          '000333000',
          '000333000',
          '000333000',
          '000333000',
          '000330000',
          '002200000',
        ],
      ],
    },

    /* The janitor. Nobody drives it and it has no face - it is a prop that
     * walks, summoned by restoreAll() once the text has gone home, to clear the
     * debris that has no home to go to. Two frames: the head wags left, then
     * right, and the bristle tips change their gaps between them, so a pass
     * reads as sweeping rather than sliding. */
    broom: {
      w: 11, h: 16, pal: ['', '#c9c9c9', '#8f8f8f'],
      frames: [
        [ // 0 - head planted, handle leaning back
          '00000001100',
          '00000011100',
          '00000011000',
          '00000110000',
          '00000110000',
          '00001100000',
          '00001100000',
          '00011000000',
          '00011000000',
          '00111100000',
          '00222200000',   // the binding band
          '01111110000',
          '01111111000',
          '11111111100',
          '11111111110',
          '11011011010',   // bristle tips
        ],
        [ // 1 - head swung forward, tips splayed the other way
          '00000011000',
          '00000111000',
          '00000110000',
          '00000110000',
          '00001100000',
          '00001100000',
          '00001100000',
          '00011000000',
          '00011000000',
          '00011110000',
          '00022220000',
          '00111111000',
          '01111111100',
          '01111111110',
          '11111111110',
          '01101101101',
        ],
      ],
    },
  };

  // These patrol the bottom of the page permanently, so they're excluded from
  // the random wanderer pool.
  const GROUND_CREW = ['plumber', 'cat'];
  // The muncher is always on screen too, but it runs lanes across the page
  // instead of walking the floor, so it gets its own keeper below. Both lists
  // are kept out of the pool the wanderers are drawn from.
  const ALWAYS_ON = [...GROUND_CREW, 'muncher', 'lemming'];
  // Summoned by name for one job and gone again - never a wanderer, never a
  // hammer target, so it stays out of the pool spawn() draws from.
  const SUMMONED = ['broom'];
  const NAMES = Object.keys(SPRITES)
    .filter((n) => !ALWAYS_ON.includes(n) && !SUMMONED.includes(n));
  const PX = 3; // one sprite pixel = 3 CSS px

  /* ---------- state ---------- */

  const dpr = () => Math.min(devicePixelRatio || 1, 2);

  let bgCanvas, fxCanvas, bgCtx, fxCtx;
  let controls = null;
  let arcadeOn = true;
  let hammerOn = false;

  const cast = [];
  const particles = [];
  const smashed = new Map(); // element -> particle[]
  const spriteCache = new Map();
  const glyphCache = new Map();

  // False until the canvases exist. init() returns early under reduced motion
  // or when the layer is disabled, and the router still calls onRouteChange(),
  // so every entry point has to check this before touching a context.
  let ready = false;
  let rafId = null;
  let lastT = 0;
  let spawnTimer = 0;
  let pointer = { x: -1e4, y: -1e4 };
  let restoring = false;
  let sweep = null; // the broom's one pass; see startSweep()

  const DENSITY = { calm: 2, normal: 4, busy: 6 };
  let maxCast = 4;
  const MAX_PARTICLES = 4000;
  const MAX_CHARS = 240;

  /* ---------- sprite rasterisation ---------- */

  // A sprite is either a single grid (`rows`) or an animation (`frames`).
  const framesOf = (def) => def.frames || [def.rows];

  function buildSprite(name, fi = 0) {
    const key = `${name}#${fi}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    const def = SPRITES[name];
    const rows = framesOf(def)[fi] || framesOf(def)[0];
    const scale = PX * dpr();
    const c = document.createElement('canvas');
    c.width = def.w * scale;
    c.height = def.h * scale;
    const g = c.getContext('2d');

    rows.forEach((row, y) => {
      if (row.length !== def.w) {
        throw new Error(`sprite "${name}" frame ${fi} row ${y} is ${row.length} px, expected ${def.w}`);
      }
      for (let x = 0; x < def.w; x++) {
        const colour = def.pal[+row[x]];
        if (!colour) continue;
        g.fillStyle = colour;
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    });

    const built = { canvas: c, w: def.w * PX, h: def.h * PX };
    spriteCache.set(key, built);
    return built;
  }

  /* Which frame to draw. The plumber alternates its two walk frames and holds
   * the second one while airborne; the cat walks through frames 0-2, holds
   * frame 1 (legs extended) while airborne, and cycles two sitting poses;
   * the muncher chomps while it travels and plays its death frames once, on a
   * clock of its own; the ghosts and invaders flip between two frames. */
  const CAT_AIR_FRAME = 1;
  const PLUMBER_WALK_FPS = 1 / 0.12;   // the GIF holds each pose for 120ms
  const PLUMBER_AIR_FRAME = 1;   // legs apart reads as a jump

  // Shut, half, wide, half - a mouth that opens and closes, not one that snaps
  // back to shut from wide.
  const CHOMP = [0, 1, 2, 1];
  const CHOMP_FPS = 11;
  const DIE_FIRST = 3;              // first death frame in muncher.frames
  const DIE_FRAMES = 6;             // 3..8
  const DIE_STEP = 0.13;            // seconds per death frame
  const DIE_DUR = DIE_FRAMES * DIE_STEP;

  const LEM_WALK = 8;          // walk frames 0..7
  const LEM_WALK_FPS = 11;
  const LEM_FLOAT_FPS = 5;     // the canopy breathing while it drifts down

  /* Two-frame characters, and how many flips a second each one gets. The ghosts
   * flow, so theirs is quick and continuous; the invaders keep the slow march
   * beat of the original, where the whole formation snaps between poses. */
  const FLIP_FPS = {
    ghostPink: 6,
    ghostCyan: 6,
    invader: 3,
    invaderSquid: 3.4,   // the top row is the fast one
    invaderOcto: 2.4,    // the bottom row is the slow one
  };

  function frameFor(s) {
    if (s.name === 'muncher') {
      if (s.dying) {
        const i = Math.floor(s.dieT / DIE_STEP);
        return DIE_FIRST + Math.min(DIE_FRAMES - 1, i);
      }
      // One that has stopped to look around holds its mouth shut.
      if (s.state === 'stroll' && s.resting) return 0;
      return CHOMP[Math.floor(s.anim * CHOMP_FPS) % CHOMP.length];
    }
    if (s.name === 'lemming') {
      if (s.floating) return LEM_WALK + (Math.floor(s.anim * LEM_FLOAT_FPS) % 2);
      return Math.floor(s.anim * LEM_WALK_FPS) % LEM_WALK;
    }
    if (s.name === 'plumber') {
      if (s.vy !== 0) return PLUMBER_AIR_FRAME;
      return Math.floor(s.anim * PLUMBER_WALK_FPS) % 2;
    }
    const flip = FLIP_FPS[s.name];
    if (flip) return Math.floor(s.anim * flip) % 2;
    if (s.name !== 'cat') return 0;
    if (s.sitting) return 3 + (Math.floor(s.anim * 1.2) % 2);
    if (s.vy !== 0) return CAT_AIR_FRAME;
    return Math.floor(s.anim * 7) % 3;
  }

  /* ---------- canvases ---------- */

  function makeCanvas(cls) {
    const c = document.createElement('canvas');
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    return c;
  }

  function sizeCanvases() {
    const r = dpr();
    [bgCanvas, fxCanvas].forEach((c) => {
      c.width = Math.floor(innerWidth * r);
      c.height = Math.floor(innerHeight * r);
      c.style.width = `${innerWidth}px`;
      c.style.height = `${innerHeight}px`;
      const ctx = c.getContext('2d');
      ctx.setTransform(r, 0, 0, r, 0, 0);
      ctx.imageSmoothingEnabled = false; // keep pixel edges crisp
    });
    spriteCache.clear(); // rebuilt at the new DPR on next draw
  }

  /* ---------- the cast ---------- */

  function anchors() {
    const sel = '.tab, .card, .section-head h2, .site-header, .hero-actions .btn';
    return [...document.querySelectorAll(sel)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.height > 18 &&
             r.bottom > 60 && r.top < innerHeight - 40;
    });
  }

  /* ---------- ground crew ----------
   * The plumber and the cat walk the bottom of the viewport and jump now and
   * then. Unlike the wanderers they turn at the edges instead of leaving, so
   * they're always there. Smash one and it walks back on at the next spawn
   * tick, which gives a natural couple of seconds before it returns. */

  /* ---------- platforms ----------
   * Real page elements the cat can land on. Recomputed on a timer rather than
   * per frame: getBoundingClientRect on a dozen nodes every frame would force
   * layout 60x a second. */

  let platforms = [];
  let platformTimer = 0;

  function refreshPlatforms() {
    const sel = '.card, .btn, .section-head h2, .hero-portrait, .handle-box, ' +
                '.eyebrow, .hero-tagline, .about-body p, .timeline-item, .tag';
    platforms = [...document.querySelectorAll(sel)]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 60 && r.top > 70 && r.top < innerHeight - 90)
      .map((r) => ({ top: r.top, left: r.left, right: r.right }));
  }

  function groundY(h) {
    // Clear the mobile tab bar; on desktop that bar isn't rendered.
    const navPad = innerWidth < 861 ? 64 : 0;
    return innerHeight - h - navPad - 6;
  }

  function ensureGroundCrew() {
    GROUND_CREW.forEach((name, i) => {
      if (cast.some((s) => s.name === name)) return;
      const sp = buildSprite(name);
      const dir = Math.random() < 0.5 ? 1 : -1;
      // Start each one in its own band so they don't appear in a clump.
      const band = Math.max(1, (innerWidth - sp.w - 40) / GROUND_CREW.length);
      cast.push({
        name, w: sp.w, h: sp.h,
        state: name === 'cat' ? 'cat' : 'ground',
        x: 20 + band * i + Math.random() * band * 0.6,
        y: groundY(sp.h),
        groundY: groundY(sp.h),
        vx: dir * (name === 'cat' ? 34 + Math.random() * 20 : 26 + Math.random() * 16),
        vy: 0,
        face: dir, bob: 0, life: 0, hop: 0, hold: 0,
        jumpT: 1.5 + Math.random() * 3,
        seek: null, seekT: 0, anim: 0,
        sitting: false, sitT: 4 + Math.random() * 5,
        dead: false,
      });
    });
  }

  /* ---------- the muncher ----------
   * The one character that is always on screen. It runs a lane straight across
   * the page and turns at the wall rather than leaving, and picks a new lane on
   * every turn so it works its way over the whole page instead of sawing back
   * and forth on one line. Smash it and ensureMuncher() brings it back on the
   * next spawn tick, which leaves a beat before it reappears. */

  const LANE_TOP = 96;          // clear of the header
  const LANE_DRIFT = 70;        // px/s it slides toward a new lane

  function laneY(h) {
    const bottom = groundY(h);
    return LANE_TOP + Math.random() * Math.max(1, bottom - LANE_TOP);
  }

  function ensureMuncher() {
    if (cast.some((s) => s.name === 'muncher')) return;
    const sp = buildSprite('muncher');
    const dir = Math.random() < 0.5 ? 1 : -1;
    const lane = laneY(sp.h);
    cast.push({
      name: 'muncher', w: sp.w, h: sp.h,
      state: 'munch',
      // Comes in off the edge rather than popping into existence mid-page.
      x: dir === 1 ? -sp.w - 8 : innerWidth + 8,
      y: lane, lane, entered: false,
      vx: dir * (54 + Math.random() * 22),
      vy: 0,
      face: dir, bob: 0, life: 0, hop: 0, hold: 0, anim: 0,
      dead: false, dying: false, dieT: 0,
    });
  }

  /* ---------- the lemmings ----------
   * These walk along real page elements. Each one is put down on top of one of
   * the platforms the cat uses, walks until the ground under its feet runs out,
   * then opens its umbrella and floats down to whatever is below - another
   * element, or the floor - and carries on walking there. They turn at the
   * viewport edges rather than leaving, so a pair is always somewhere on screen.
   *
   * Nothing here tracks which element it is standing on: support is re-derived
   * from the live platform list every frame, exactly as the cat's landing is, so
   * an element that scrolls away or reflows simply drops whoever was on it. */

  const LEM_SPEED = 26;         // px/s - a deliberate plod
  const LEM_FALL = 58;          // px/s under the umbrella
  const LEM_DRIFT = 10;         // px/s sideways while floating

  function lemmingCount() {
    return innerWidth < 861 ? 1 : 2;
  }

  function ensureLemmings() {
    const have = cast.filter((s) => s.name === 'lemming').length;
    if (have >= lemmingCount() || !platforms.length) return;
    const sp = buildSprite('lemming');
    const pf = platforms[(Math.random() * platforms.length) | 0];
    const span = Math.max(1, pf.right - pf.left - sp.w);
    const dir = Math.random() < 0.5 ? 1 : -1;
    cast.push({
      name: 'lemming', w: sp.w, h: sp.h,
      state: 'lemming',
      x: pf.left + Math.random() * span,
      y: pf.top - sp.h,
      vx: dir * LEM_SPEED,
      vy: 0,
      floating: false,
      face: dir, bob: 0, life: 0, hop: 0, hold: 0, anim: 0,
      dead: false, dying: false, dieT: 0,
    });
  }

  // The platform under a lemming's feet, or null when it's over thin air.
  function supportUnder(s) {
    const cx = s.x + s.w / 2;
    const feet = s.y + s.h;
    for (const pf of platforms) {
      if (cx < pf.left || cx > pf.right) continue;
      if (Math.abs(feet - pf.top) < 3) return pf;
    }
    return null;
  }

  function spawn() {
    // The always-on characters never count against the wanderer cap, or they'd
    // starve it.
    if (cast.filter((s) => !ALWAYS_ON.includes(s.name)).length >= maxCast) return;

    const name = NAMES[(Math.random() * NAMES.length) | 0];
    const s = buildSprite(name);
    const roll = Math.random();
    const sprite = {
      name, w: s.w, h: s.h,
      face: 1, bob: 0, life: 0, anim: 0,
      vx: 0, vy: 0, hop: 0,
      state: 'stroll', hold: 0, dead: false,
      dying: false, dieT: 0,
    };

    if (roll < 0.34) {
      // fall - drift down from above with a slow sway
      sprite.state = 'fall';
      sprite.x = 40 + Math.random() * (innerWidth - 120);
      sprite.y = -sprite.h - Math.random() * 120;
      sprite.vy = 14 + Math.random() * 14;
      sprite.sway = 0.6 + Math.random() * 0.8;
      sprite.swayT = Math.random() * 6;
    } else if (roll < 0.7) {
      // peek - hide behind an anchor and lean out over its top edge
      const list = anchors();
      if (!list.length) return;
      const a = list[(Math.random() * list.length) | 0].getBoundingClientRect();
      sprite.state = 'peek';
      sprite.x = a.left + 12 + Math.random() * Math.max(1, a.width - sprite.w - 24);
      sprite.baseY = a.top - 2;          // just behind the anchor's top edge
      sprite.y = sprite.baseY;
      sprite.peekT = 0;
      sprite.peekRise = sprite.h * (0.55 + Math.random() * 0.25);
      sprite.hold = 1.6 + Math.random() * 2.2;
      sprite.face = Math.random() < 0.5 ? 1 : -1;
    } else {
      // stroll - walk across a random band
      sprite.state = 'stroll';
      const dir = Math.random() < 0.5 ? 1 : -1;
      sprite.face = dir;
      sprite.x = dir === 1 ? -sprite.w - 10 : innerWidth + 10;
      sprite.y = 90 + Math.random() * Math.max(40, innerHeight - 220);
      sprite.vx = dir * (18 + Math.random() * 22);
      sprite.pause = 2 + Math.random() * 4;
    }

    cast.push(sprite);
  }

  function stepCast(dt) {
    for (let i = cast.length - 1; i >= 0; i--) {
      const s = cast[i];

      // Dying freezes it where it stands - no walking, no bob, no looking at
      // the cursor - and the collapse plays out on its own clock.
      if (s.dying) {
        s.dieT += dt;
        if (s.dieT >= DIE_DUR) {
          sparkle(s.x + s.w / 2, s.y + s.h / 2, SPRITES[s.name].pal[1]);
          cast.splice(i, 1);
        }
        continue;
      }

      s.life += dt;
      s.bob += dt * 6;
      s.anim = (s.anim || 0) + dt;

      if (s.hop > 0) s.hop = Math.max(0, s.hop - dt * 3);

      if (s.state === 'stroll') {
        s.pause -= dt;
        if (s.pause <= 0) {
          // stop and look around for a beat, then carry on
          s.pause = 2 + Math.random() * 4;
          s.resting = !s.resting;
        }
        if (!s.resting) s.x += s.vx * dt;
        if (s.x < -s.w - 40 || s.x > innerWidth + 40) s.dead = true;

      } else if (s.state === 'fall') {
        s.y += s.vy * dt;
        s.swayT += dt;
        s.x += Math.sin(s.swayT * s.sway) * 14 * dt;
        if (s.y > innerHeight + s.h) s.dead = true;

      } else if (s.state === 'cat') {
        // Walks the page, hops onto whatever content is within reach, and
        // falls back to the floor when it runs off an edge.
        const CAT_G = 1000;
        // Measured on the About tab: the lowest content sits ~360px above the
        // floor, so a "realistic" 190px hop could never reach anything. This
        // is a big arcade leap on purpose.
        const CAT_MAXV = 940;
        const CAT_REACH = (CAT_MAXV * CAT_MAXV) / (2 * CAT_G) - 20; // ~420px

        // Pick something to climb and walk toward it. Without this the cat only
        // jumps when a platform happens to be overhead, which almost never
        // lines up - airtime is ~1s and it drifts barely 30px sideways.
        // Sit / walk cycle. While sitting it holds still and does not climb.
        s.sitT -= dt;
        if (s.sitT <= 0) {
          s.sitting = !s.sitting;
          s.sitT = s.sitting ? (2.5 + Math.random() * 3.5) : (5 + Math.random() * 6);
          if (!s.sitting) s.vx = Math.sign(s.vx || 1) * (34 + Math.random() * 20);
        }
        // Time spent off the floor. Without this the cat happily hops between
        // platforms forever and never comes back down.
        const onFloor = Math.abs(s.y - groundY(s.h)) < 4;
        s.upT = onFloor ? 0 : (s.upT || 0) + dt;
        s.descend = s.upT > 7;
        if (onFloor) s.descend = false;

        s.seekT -= dt;
        if (s.sitting || s.descend) s.seek = null;
        else if (!s.seek || s.seekT <= 0) {
          const f = s.y + s.h;
          const reachable = platforms.filter((pf) => {
            const dy = f - pf.top;
            return dy > 18 && dy < CAT_REACH;
          });
          s.seek = reachable.length ? reachable[(Math.random() * reachable.length) | 0] : null;
          s.seekT = 4 + Math.random() * 4;
        }
        if (s.seek) {
          const cxNow = s.x + s.w / 2;
          const aim = (s.seek.left + s.seek.right) / 2;
          if (Math.abs(aim - cxNow) > 8) s.vx = Math.sign(aim - cxNow) * Math.abs(s.vx);
        }

        if (!s.sitting) s.x += s.vx * dt;
        if (s.x <= 4) { s.x = 4; s.vx = Math.abs(s.vx); }
        else if (s.x >= innerWidth - s.w - 4) { s.x = innerWidth - s.w - 4; s.vx = -Math.abs(s.vx); }
        if (!s.sitting) s.face = s.vx > 0 ? 1 : -1;

        const prevFeet = s.y + s.h;
        s.vy += CAT_G * dt;
        s.y += s.vy * dt;
        const feet = s.y + s.h;

        // Landing is re-derived every frame from the live platform list, so
        // walking off an edge (or the element scrolling away) drops the cat
        // with no extra bookkeeping.
        if (s.vy >= 0 && !s.descend) {
          const cx = s.x + s.w / 2;
          let best = null;
          for (const pf of platforms) {
            if (cx < pf.left || cx > pf.right) continue;
            if (prevFeet <= pf.top + 2 && feet >= pf.top - 0.5) {
              if (!best || pf.top < best.top) best = pf;
            }
          }
          if (best) { s.y = best.top - s.h; s.vy = 0; s.landed = true; }
        }

        const gy = groundY(s.h);
        if (s.y >= gy) { s.y = gy; s.vy = 0; s.landed = true; }

        if (s.landed && s.jumping) {
          s.jumping = false;
          s.vx = Math.sign(s.vx || 1) * (34 + Math.random() * 20);
        }
        s.landed = false;

        // Sitting is only valid on a surface. This has to run AFTER the
        // integration above: if the platform vanished this frame the cat is
        // already falling, and checking earlier would draw a sitting pose
        // mid-air for one frame.
        if (s.sitting && s.vy !== 0) { s.sitting = false; s.sitT = 4 + Math.random() * 4; }

        if (s.vy === 0 && !s.sitting) {
          s.jumpT -= dt;
          if (s.jumpT <= 0) {
            // Leap only when actually underneath something reachable, using
            // exactly the velocity needed to clear it; otherwise a small idle
            // hop. Once it lands, the seek target is cleared so it moves on.
            const cx = s.x + s.w / 2;
            let target = null;
            // While heading home it refuses to climb, so walking off the edge
            // of whatever it's on drops it back toward the floor.
            if (!s.descend) {
              for (const pf of platforms) {
                const dy = feet - pf.top;
                if (dy < 18 || dy > CAT_REACH) continue;               // not above / too high
                if (cx < pf.left - 12 || cx > pf.right + 12) continue; // not underneath
                if (!target || dy < target.dy) target = { dy };
              }
            }
            if (target) {
              s.vy = -Math.sqrt(2 * CAT_G * (target.dy + 14));
              // Airtime is ~1.8s at this height; at walking speed the cat would
              // sail straight past the platform, so slow it for the ascent and
              // restore the pace on landing.
              s.jumping = true;
              s.vx = Math.sign(s.vx || 1) * 10;
              s.seek = null;                 // climbed it - pick a new goal next
              s.seekT = 3 + Math.random() * 3;
            } else {
              s.vy = -(280 + Math.random() * 150);
            }
            s.jumpT = 1.2 + Math.random() * 2.2;
          }
        }

      } else if (s.state === 'ground') {
        s.x += s.vx * dt;
        // Turn at the edges rather than walking off.
        if (s.x <= 4) { s.x = 4; s.vx = Math.abs(s.vx); }
        else if (s.x >= innerWidth - s.w - 4) { s.x = innerWidth - s.w - 4; s.vx = -Math.abs(s.vx); }
        s.face = s.vx > 0 ? 1 : -1;

        // Jump on a timer; only while actually on the ground.
        if (s.vy === 0) {
          s.jumpT -= dt;
          if (s.jumpT <= 0) { s.vy = -250; s.jumpT = 1.8 + Math.random() * 3.4; }
        }
        if (s.vy !== 0) {
          s.vy += 700 * dt;
          s.y += s.vy * dt;
          if (s.y >= s.groundY) { s.y = s.groundY; s.vy = 0; }
        }

      } else if (s.state === 'lemming') {
        if (!s.floating) {
          s.x += s.vx * dt;
          // Turn at the viewport walls rather than walking off the page.
          if (s.x <= 2) { s.x = 2; s.vx = Math.abs(s.vx); }
          else if (s.x >= innerWidth - s.w - 2) { s.x = innerWidth - s.w - 2; s.vx = -Math.abs(s.vx); }
          s.face = s.vx > 0 ? 1 : -1;

          // Walked off the end of whatever it was on: out comes the umbrella.
          // The floor is the one surface it can't walk off.
          const onFloor = Math.abs(s.y - groundY(s.h)) < 3;
          if (!onFloor && !supportUnder(s)) {
            s.floating = true;
            s.vy = LEM_FALL;
            s.anim = 0;              // start the canopy cycle on frame 8
          }
        } else {
          const prevFeet = s.y + s.h;
          s.y += s.vy * dt;
          // Umbrellas drift. It keeps its heading so it carries on the same way
          // once it touches down.
          s.x += Math.sign(s.vx || 1) * LEM_DRIFT * dt;
          s.x = Math.max(2, Math.min(s.x, innerWidth - s.w - 2));
          const feet = s.y + s.h;

          // Land on the highest surface its feet crossed this frame, otherwise
          // ride down to the floor.
          const cx = s.x + s.w / 2;
          let landed = null;
          for (const pf of platforms) {
            if (cx < pf.left || cx > pf.right) continue;
            if (prevFeet <= pf.top + 2 && feet >= pf.top - 0.5) {
              if (!landed || pf.top < landed.top) landed = pf;
            }
          }
          const gy = groundY(s.h);
          if (landed) s.y = landed.top - s.h;
          else if (s.y >= gy) { s.y = gy; landed = true; }

          if (landed) {
            s.floating = false;
            s.vy = 0;
            s.vx = Math.sign(s.vx || 1) * LEM_SPEED;
          }
        }

      } else if (s.state === 'munch') {
        s.x += s.vx * dt;
        // It starts off the edge, so the turn-at-the-wall rule only applies once
        // it is fully on screen - otherwise it would bounce off its own entrance.
        if (!s.entered && s.x > 4 && s.x < innerWidth - s.w - 4) s.entered = true;
        if (s.entered) {
          if (s.x <= 4) { s.x = 4; s.vx = Math.abs(s.vx); s.lane = laneY(s.h); }
          else if (s.x >= innerWidth - s.w - 4) {
            s.x = innerWidth - s.w - 4; s.vx = -Math.abs(s.vx); s.lane = laneY(s.h);
          }
        }
        s.face = s.vx > 0 ? 1 : -1;
        // Slide toward the current lane instead of jumping to it, so a turn
        // reads as changing corridor rather than teleporting.
        const dLane = s.lane - s.y;
        if (Math.abs(dLane) > 1) {
          s.y += Math.sign(dLane) * Math.min(Math.abs(dLane), LANE_DRIFT * dt);
        }

      } else if (s.state === 'peek') {
        s.peekT += dt;
        // rise out, hold, drop back behind the anchor
        const rise = s.peekRise;
        if (s.peekT < 0.6) {
          s.y = s.baseY - rise * (s.peekT / 0.6);
        } else if (s.peekT < 0.6 + s.hold) {
          s.y = s.baseY - rise;
        } else if (s.peekT < 1.2 + s.hold) {
          s.y = s.baseY - rise * (1 - (s.peekT - 0.6 - s.hold) / 0.6);
        } else {
          s.dead = true;
        }
      }

      // Look toward the cursor while idle (fine pointers only). Anyone on a
      // fixed heading is excluded - they must face the way they travel, or they
      // moonwalk (and a muncher would be chomping backwards).
      if (finePointer && pointer.x > -1e3 &&
          s.state !== 'ground' && s.state !== 'cat' &&
          s.state !== 'munch' && s.state !== 'lemming') {
        const dx = pointer.x - (s.x + s.w / 2);
        if (Math.abs(dx) > 24 && (s.state !== 'stroll' || s.resting)) {
          s.face = dx > 0 ? 1 : -1;
        }
      }

      if (s.dead) cast.splice(i, 1);
    }
  }

  function drawCast() {
    for (const s of cast) {
      const sp = buildSprite(s.name, frameFor(s));
      const walking = !s.dying &&
                      ((s.state === 'stroll' && !s.resting) ||
                       ((s.state === 'ground' || s.state === 'cat') && s.vy === 0));
      const bob = walking ? Math.round(Math.sin(s.bob) * 1.5) : 0;
      const hop = s.hop > 0 ? -Math.sin(s.hop * Math.PI) * 10 : 0;

      bgCtx.save();
      bgCtx.translate(Math.round(s.x + sp.w / 2), Math.round(s.y + bob + hop));
      bgCtx.scale(s.face, 1);
      bgCtx.drawImage(sp.canvas, Math.round(-sp.w / 2), 0, sp.w, sp.h);
      bgCtx.restore();
    }
  }

  // A click anywhere makes the nearest characters turn and hop toward it.
  function reactTo(x, y) {
    const near = cast
      .filter((s) => !s.dying)
      .map((s) => ({ s, d: Math.hypot(s.x + s.w / 2 - x, s.y + s.h / 2 - y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { s } of near) {
      s.face = x > s.x + s.w / 2 ? 1 : -1;
      s.hop = 1;
      if (s.state === 'stroll') s.resting = true;
    }
  }

  /* ---------- hammer: words -> pixels ---------- */

  const BREAKABLE = [
    'h1', 'h2', 'h3', 'h4', 'p', 'label', 'li',
    '.tag', '.eyebrow', '.tab', '.timeline-year', '.gradient-text',
    '.brand-text', '.hero-greeting', '.s-note', '.project-more',
  ].join(',');

  // Breaking the line about breaking rules throws the rules themselves out:
  // spinning 90s WordArt חוק, one per hit. Matched on the text so the copy in
  // content.js stays plain strings - reword it and this keeps working as long
  // as "לשבור חוקים" survives.
  const RULE_LINE = /לשבור\s+חוקים/;

  // Sample one glyph's ink so the word breaks along its real letterforms
  // instead of into rectangles. Cached per char+font+size.
  function glyphPixels(ch, font, w, h, step) {
    const key = `${ch}|${font}|${Math.round(w)}x${Math.round(h)}|${step}`;
    if (glyphCache.has(key)) return glyphCache.get(key);

    const cw = Math.max(1, Math.ceil(w));
    const chh = Math.max(1, Math.ceil(h));
    const c = document.createElement('canvas');
    c.width = cw; c.height = chh;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.fillText(ch, cw / 2, chh / 2);

    const pts = [];
    try {
      const data = g.getImageData(0, 0, cw, chh).data;
      for (let y = 0; y < chh; y += step) {
        for (let x = 0; x < cw; x += step) {
          if (data[(y * cw + x) * 4 + 3] > 128) pts.push([x, y]);
        }
      }
    } catch {
      // getImageData unavailable - fall back to filling the character box
      for (let y = 0; y < chh; y += step) {
        for (let x = 0; x < cw; x += step) pts.push([x, y]);
      }
    }
    glyphCache.set(key, pts);
    return pts;
  }

  function inkColour(el) {
    const cs = getComputedStyle(el);
    const c = cs.color;
    // .gradient-text paints via background-clip, so its colour is transparent.
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map((n) => parseFloat(n));
      if (parts.length > 3 && parts[3] === 0) return ACCENT;
    }
    return c;
  }

  function smash(el) {
    if (smashed.has(el)) return false;

    const cs = getComputedStyle(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const colour = inkColour(el);
    const size = Math.max(2, Math.round(parseFloat(cs.fontSize) / 9));
    const step = Math.max(3, size + 1);

    // Collect every visible character with its exact on-screen box. Using Range
    // rects means wrapping, RTL and letter-spacing are already accounted for.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const made = [];
    let count = 0;
    let node;

    while ((node = walker.nextNode()) && count < MAX_CHARS) {
      const text = node.nodeValue;
      for (let i = 0; i < text.length && count < MAX_CHARS; i++) {
        const ch = text[i];
        if (!ch.trim()) continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width < 0.5 || r.height < 0.5) continue;
        count++;

        for (const [gx, gy] of glyphPixels(ch, font, r.width, r.height, step)) {
          if (particles.length >= MAX_PARTICLES) break;
          const px = r.left + gx + scrollX;
          const py = r.top + gy + scrollY;
          const p = {
            x: px, y: py, ox: px, oy: py,
            vx: (Math.random() - 0.5) * 260,
            vy: -80 - Math.random() * 220,
            size, colour, el, settled: false,
            floor: scrollY + innerHeight - 4,
          };
          particles.push(p);
          made.push(p);
        }
      }
    }

    if (!made.length) return false;
    smashed.set(el, made);
    el.classList.add('smashed');
    if (RULE_LINE.test(el.textContent || '')) throwRules(el.getBoundingClientRect());
    return true;
  }

  /* ---------- WordArt rules ----------
   * Deliberately the ugliest thing on the site: rainbow gradient, fake extrude,
   * fat outline. It is a joke about 1997, so it should look like 1997.
   *
   * Unlike the pixel debris these do NOT fall - they drift around the viewport
   * and bounce off its edges, because they are targets: the whole point is to
   * chase one down with the hammer and break the rule yourself. They live in
   * viewport space (no scroll offset) so scrolling never carries them away. */

  const wordArts = [];
  const MAX_WORDARTS = 18;
  const RULE_WORD = 'חוק';
  const WORDART_FONT = "900 %spx 'Tel Aviv Eclectic', 'Heebo', sans-serif";
  const WORDART_SKINS = [
    ['#ffe9a8', '#ff9f43', '#c0392b'],
    ['#a8f0ff', '#6aa9ff', '#5b2bd6'],
    ['#ffd6f5', '#ff6ad5', '#7a1f8f'],
    ['#e8ffc8', '#6ee36e', '#12703a'],
  ];

  const wordArtFont = (size) => WORDART_FONT.replace('%s', Math.round(size));

  function throwRules(rect) {
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      if (wordArts.length >= MAX_WORDARTS) return;
      const size = 26 + Math.random() * 30;
      // Thrown outwards from the line, mostly upwards so they clear the card.
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = 90 + Math.random() * 110;
      fxCtx.font = wordArtFont(size);
      wordArts.push({
        x: rect.left + Math.random() * rect.width,
        y: rect.top + rect.height / 2,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        rot: (Math.random() - 0.5) * 0.8,
        vrot: (Math.random() - 0.5) * 2.4,
        size,
        w: fxCtx.measureText(RULE_WORD).width,
        h: size * 0.95,
        skin: WORDART_SKINS[Math.floor(Math.random() * WORDART_SKINS.length)],
        alpha: 1,
      });
    }
  }

  function stepWordArts(dt) {
    if (restoring) return;
    for (const w of wordArts) {
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.rot += w.vrot * dt;

      // Bounce off the viewport edges, using the rotated word's half-diagonal
      // so a spinning one never clips through a wall.
      const r = Math.hypot(w.w, w.h) / 2;
      if (w.x < r) { w.x = r; w.vx = Math.abs(w.vx); w.vrot = -w.vrot; }
      if (w.x > innerWidth - r) { w.x = innerWidth - r; w.vx = -Math.abs(w.vx); w.vrot = -w.vrot; }
      if (w.y < r) { w.y = r; w.vy = Math.abs(w.vy); w.vrot = -w.vrot; }
      if (w.y > innerHeight - r) { w.y = innerHeight - r; w.vy = -Math.abs(w.vy); w.vrot = -w.vrot; }
    }
  }

  // Shared by the draw pass and the shatter raster, so the debris comes off
  // exactly the artwork you were looking at.
  function paintWordArt(ctx, size, skin) {
    const [top, mid, deep] = skin;
    ctx.font = wordArtFont(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Fake extrude: the same word stamped back along the diagonal.
    const depth = Math.max(2, Math.round(size / 9));
    ctx.fillStyle = deep;
    for (let d = depth; d > 0; d--) ctx.fillText(RULE_WORD, d, d);

    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, top);
    g.addColorStop(0.55, mid);
    g.addColorStop(1, deep);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size / 10);
    ctx.strokeStyle = '#1b0a1b';
    ctx.strokeText(RULE_WORD, 0, 0);
    ctx.fillStyle = g;
    ctx.fillText(RULE_WORD, 0, 0);
  }

  function drawWordArts() {
    for (const w of wordArts) {
      fxCtx.save();
      fxCtx.globalAlpha = w.alpha;
      fxCtx.translate(Math.round(w.x), Math.round(w.y));
      fxCtx.rotate(w.rot);
      paintWordArt(fxCtx, w.size, w.skin);
      fxCtx.restore();
    }
    fxCtx.globalAlpha = 1;
  }

  /* ---------- breaking a rule ----------
   * Rasterise the word as drawn, then scatter its own ink. These particles are
   * transient: no element to un-hide, they just tween to nothing on restore. */

  function hitTestWordArts(x, y) {
    for (let i = wordArts.length - 1; i >= 0; i--) {
      const w = wordArts[i];
      // Into the word's own frame, then a plain box test with a little slack.
      const dx = x - w.x;
      const dy = y - w.y;
      const c = Math.cos(-w.rot);
      const s = Math.sin(-w.rot);
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;
      if (Math.abs(lx) <= w.w / 2 + 8 && Math.abs(ly) <= w.h / 2 + 8) return i;
    }
    return -1;
  }

  function breakWordArt(index) {
    const w = wordArts[index];
    wordArts.splice(index, 1);

    const pad = Math.ceil(w.size / 3);
    const cw = Math.ceil(w.w) + pad * 2;
    const ch = Math.ceil(w.h) + pad * 2;
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.translate(cw / 2, ch / 2);
    paintWordArt(g, w.size, w.skin);

    const size = Math.max(2, Math.round(w.size / 9));
    const step = size + 1;
    const cos = Math.cos(w.rot);
    const sin = Math.sin(w.rot);
    let data;
    try {
      data = g.getImageData(0, 0, cw, ch).data;
    } catch {
      data = null; // canvas tainted or unavailable - fall back to a spark burst
    }

    if (data) {
      for (let y = 0; y < ch; y += step) {
        for (let x = 0; x < cw; x += step) {
          const i = (y * cw + x) * 4;
          if (data[i + 3] < 128) continue;
          if (particles.length >= MAX_PARTICLES) break;
          // Local offset -> rotated -> viewport -> page, so every shard starts
          // exactly where its pixel was on screen.
          const ox = x - cw / 2;
          const oy = y - ch / 2;
          const px = w.x + ox * cos - oy * sin + scrollX;
          const py = w.y + ox * sin + oy * cos + scrollY;
          particles.push({
            x: px, y: py, ox: px, oy: py,
            vx: (ox / (cw / 2)) * 150 + (Math.random() - 0.5) * 120,
            vy: -120 - Math.random() * 200,
            size,
            colour: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
            el: null, transient: true, settled: false,
            floor: scrollY + innerHeight - 4,
          });
        }
      }
    } else {
      sparkle(w.x, w.y, w.skin[1]);
    }
    shock(w.x, w.y);
    return true;
  }

  /* ---------- smashing a character ----------
   * The sprite grid is already pixel data, so its own pixels become the
   * debris - a hit looks like the character coming apart, not a generic burst.
   * These particles are marked transient: they tween home like everything else
   * on restore, but there is no element to un-hide, so they simply clear. */

  function hitTestCast(x, y) {
    for (let i = cast.length - 1; i >= 0; i--) {
      const s = cast[i];
      // One that is already coming apart shouldn't keep swallowing clicks -
      // let them through to whatever is behind it.
      if (s.dying) continue;
      if (x >= s.x - 6 && x <= s.x + s.w + 6 &&
          y >= s.y - 6 && y <= s.y + s.h + 6) return i;
    }
    return -1;
  }

  /* A hammer blow on the muncher plays its own death animation instead of
   * bursting into debris - that collapse is the character's signature, and the
   * spark burst at the end still pays the hit off. Everyone else explodes. */
  function hitCast(index, x, y) {
    const s = cast[index];
    if (s.name !== 'muncher') return explodeSprite(index);
    if (s.dying) return false;
    s.dying = true;
    s.dieT = 0;
    s.vx = 0;
    s.vy = 0;
    s.hop = 0;
    shock(x, y);
    return true;
  }

  function explodeSprite(index) {
    const s = cast[index];
    const def = SPRITES[s.name];
    const rows = framesOf(def)[frameFor(s)] || framesOf(def)[0];
    cast.splice(index, 1);

    for (let gy = 0; gy < def.h; gy++) {
      for (let gx = 0; gx < def.w; gx++) {
        const colour = def.pal[+rows[gy][gx]];
        if (!colour || particles.length >= MAX_PARTICLES) continue;
        // Mirror the grid when the character faces the other way.
        const localX = s.face === 1 ? gx : def.w - 1 - gx;
        const px = s.x + localX * PX + scrollX;
        const py = s.y + gy * PX + scrollY;
        particles.push({
          x: px, y: py, ox: px, oy: py,
          vx: (localX - def.w / 2) * 26 + (Math.random() - 0.5) * 90,
          vy: -110 - Math.random() * 170,
          size: PX, colour, el: null, transient: true, settled: false,
          floor: scrollY + innerHeight - 4,
        });
      }
    }
    shock(s.x + s.w / 2, s.y + s.h / 2);
    return true;
  }

  /* ---------- spark burst ----------
   * By its last death frame the muncher is a single pixel wide, so there is
   * nothing left of the sprite to scatter the way explodeSprite() does. This is
   * a symmetric burst of sparks instead: rays out from the middle, which is what
   * the original shows as the round ends. */

  function sparkle(cx, cy, colour) {
    const RAYS = 10;
    for (let r = 0; r < RAYS; r++) {
      const a = (Math.PI * 2 * r) / RAYS;
      for (let k = 1; k <= 3; k++) {
        if (particles.length >= MAX_PARTICLES) break;
        const px = cx + Math.cos(a) * k * PX + scrollX;
        const py = cy + Math.sin(a) * k * PX + scrollY;
        const speed = 70 + k * 55;
        particles.push({
          x: px, y: py, ox: px, oy: py,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 60,
          size: PX, colour, el: null, transient: true, settled: false,
          floor: scrollY + innerHeight - 4,
        });
      }
    }
    shock(cx, cy);
  }

  /* ---------- impact shockwave ---------- */

  const shocks = [];
  function shock(x, y) { shocks.push({ x, y, t: 0 }); }

  function stepShocks(dt) {
    for (let i = shocks.length - 1; i >= 0; i--) {
      shocks[i].t += dt;
      if (shocks[i].t > 0.32) shocks.splice(i, 1);
    }
  }

  function drawShocks() {
    for (const s of shocks) {
      const k = s.t / 0.32;
      const r = 6 + k * 34;
      fxCtx.globalAlpha = 1 - k;
      fxCtx.strokeStyle = LIGHT;
      fxCtx.lineWidth = 3;
      // Square ring rather than a circle - reads as pixel art, not a bubble.
      fxCtx.strokeRect(Math.round(s.x - r), Math.round(s.y - r), Math.round(r * 2), Math.round(r * 2));
      fxCtx.globalAlpha = 1;
    }
  }

  function stepParticles(dt) {
    if (restoring) return;
    for (const p of particles) {
      if (p.settled) continue;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y >= p.floor) {
        p.y = p.floor;
        p.vy = 0;
        p.vx *= 0.72;
        if (Math.abs(p.vx) < 4) p.settled = true;
      }
    }
  }

  function drawParticles() {
    const ox = scrollX;
    const oy = scrollY;
    for (const p of particles) {
      fxCtx.fillStyle = p.colour;
      fxCtx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.size, p.size);
    }
  }

  /* ---------- the broom ----------
   * Only the text pixels have somewhere to be - they came out of a word and
   * they go back into it. Sprite debris, WordArt shards and sparks never had a
   * home, so tweening them "back" was a lie the eye could read: they'd fly to
   * a spot and vanish. They stay on the floor instead, and this comes to clear
   * them: one pass, right to left the way the page reads, pushing the litter
   * along ahead of the bristles until it goes off the edge.
   *
   * The pass lives in page coordinates like the debris does, on the line where
   * the debris actually settled - not on the current viewport floor, which the
   * visitor may have scrolled somewhere else entirely. */

  const SWEEP_SPEED = 300;   // px/s the broom walks - a brisk pass, not a stroll
  const SWEEP_FPS = 7;       // the head's wag
  const SWEEP_REACH = 46;    // how far above the line the bristles still catch

  const isLitter = (p) => p.transient;

  function startSweep() {
    if (sweep) return;                       // one janitor is enough
    const litter = particles.filter(isLitter);
    if (!litter.length) return;

    // The line the pile is on. Median rather than mean: one spark that settled
    // on a different screenful shouldn't drag the whole pass off the floor.
    const floors = litter.map((p) => p.floor).sort((a, b) => a - b);
    const line = floors[Math.floor(floors.length / 2)];
    const sp = buildSprite('broom');

    sweep = {
      line,
      x: scrollX + innerWidth + sp.w,        // just off the right edge
      end: scrollX - sp.w * 2,               // gone past the left one
      t: 0,
    };
    kick();
  }

  function stepSweep(dt) {
    if (!sweep) return;
    const sp = buildSprite('broom');
    sweep.t += dt;
    sweep.x -= SWEEP_SPEED * dt;

    // Anything standing in front of the bristles gets knocked along. It is
    // thrown a little faster than the broom walks, so it stays ahead and
    // tumbles instead of being dragged in a neat line.
    const head = sweep.x + sp.w * 0.75;
    for (const p of particles) {
      if (!isLitter(p)) continue;
      if (p.x > head || p.x < sweep.x - sp.w) continue;
      if (p.y > sweep.line + 8 || p.y < sweep.line - SWEEP_REACH) continue;
      p.settled = false;
      p.vx = -SWEEP_SPEED * 1.3 - Math.random() * 60;
      p.vy = -40 - Math.random() * 90;
    }

    // Off the left edge of the page is off the page: drop it.
    for (let i = particles.length - 1; i >= 0; i--) {
      if (isLitter(particles[i]) && particles[i].x < scrollX - 60) particles.splice(i, 1);
    }

    if (sweep.x <= sweep.end) {
      // Whatever never made it under the bristles - litter on some other
      // screenful - goes with the broom rather than outliving it.
      for (let i = particles.length - 1; i >= 0; i--) {
        if (isLitter(particles[i])) particles.splice(i, 1);
      }
      sweep = null;
    }
  }

  function drawSweep() {
    if (!sweep) return;
    const frame = Math.floor(sweep.t * SWEEP_FPS) % 2;
    const sp = buildSprite('broom', frame);
    // Half a pixel of bob per step, so it walks rather than glides.
    const bob = Math.round(Math.sin(sweep.t * 14) * 1.5);
    fxCtx.drawImage(
      sp.canvas,
      Math.round(sweep.x - scrollX),
      Math.round(sweep.line - sp.h - scrollY + bob),
      sp.w, sp.h,
    );
  }

  // Putting the hammer away tweens the text's own pixels home and un-hides it.
  // The WordArt has no home to go back to, so it fades out over the same beat,
  // and the debris on the floor is left for the broom.
  function restoreAll() {
    if (!particles.length) { smashed.clear(); wordArts.length = 0; return; }
    const homing = particles.filter((p) => !isLitter(p));
    if (!homing.length) {
      // Nothing was smashed but scenery: skip the tween, fetch the broom.
      smashed.clear();
      wordArts.length = 0;
      startSweep();
      return;
    }

    restoring = true;
    const start = performance.now();
    const from = homing.map((p) => ({ p, x: p.x, y: p.y }));
    const DUR = 600;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / DUR);
      const e = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      for (const f of from) {
        f.p.x = f.x + (f.p.ox - f.x) * e;
        f.p.y = f.y + (f.p.oy - f.y) * e;
      }
      for (const w of wordArts) w.alpha = 1 - e;
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        for (const el of smashed.keys()) el.classList.remove('smashed');
        smashed.clear();
        // The text is back in the page, so its pixels go; the litter stays put
        // on the floor and waits to be swept.
        for (let i = particles.length - 1; i >= 0; i--) {
          if (!isLitter(particles[i])) particles.splice(i, 1);
        }
        wordArts.length = 0;
        restoring = false;
        startSweep();
      }
    };
    requestAnimationFrame(tick);
  }

  /* ---------- controls ---------- */

  const ICON = {
    hammer: '<path d="M14 3l7 7-3 3-2-2-8 8-3-3 8-8-2-2z"/>',
    joy: '<rect x="3" y="9" width="18" height="11" rx="3"/><path d="M8 14h3M9.5 12.5v3M16 14h.01M18 16h.01M12 9V6a3 3 0 0 1 3-3"/>',
  };

  function svg(path) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  }

  /* ---------- the hammer's bubble ----------
   * It lives next to the button rather than on the logo, because the hammer can
   * be picked up from any tab and the logo is only on one of them - a nag about
   * tidying up should be where the mess is being made.
   *
   * It shows on every pick-up (that is the joke), but leaves on its own after a
   * few seconds so it never sits there while someone is swinging. Clicking it
   * is the visitor saying "yes, I heard you": that one is remembered, same as
   * the portrait bubble's. */

  const HAMMER_BUBBLE_KEY = 'hammerBubble:hidden';
  const BUBBLE_LIFE = 8000;
  let hammerBubble = null;
  let bubbleTimer = null;

  const bubbleDismissed = () => {
    try {
      return localStorage.getItem(HAMMER_BUBBLE_KEY) === '1';
    } catch {
      return false; // storage blocked - a bubble beats a broken control
    }
  };

  function makeHammerBubble(text) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'arcade-bubble';
    el.title = 'לחצו להסתרה';
    el.hidden = true;

    // textContent, not innerHTML: this string comes from content.js and has no
    // business carrying markup. A newline in it is a deliberate line break.
    const msg = document.createElement('span');
    String(text).split(/[\r\n]+/).forEach((line, i) => {
      if (i) msg.appendChild(document.createElement('br'));
      msg.appendChild(document.createTextNode(line));
    });
    const x = document.createElement('span');
    x.className = 'bubble-x';
    x.setAttribute('aria-hidden', 'true');
    x.textContent = '×';

    el.append(msg, x);
    el.addEventListener('click', () => {
      try { localStorage.setItem(HAMMER_BUBBLE_KEY, '1'); } catch {}
      hideBubble();
    });
    return el;
  }

  function showBubble() {
    if (!hammerBubble || bubbleDismissed()) return;
    clearTimeout(bubbleTimer);
    hammerBubble.hidden = false;
    void hammerBubble.offsetWidth;        // so the transition has a start state
    hammerBubble.classList.add('is-in');
    bubbleTimer = setTimeout(hideBubble, BUBBLE_LIFE);
  }

  function hideBubble() {
    if (!hammerBubble) return;
    clearTimeout(bubbleTimer);
    hammerBubble.classList.remove('is-in');
    // Out of the layout once it has faded, so it stops taking clicks.
    bubbleTimer = setTimeout(() => { hammerBubble.hidden = true; }, 260);
  }

  function buildControls(labels, bubbleText) {
    controls = document.createElement('div');
    controls.className = 'arcade-ctl';

    const castBtn = document.createElement('button');
    castBtn.type = 'button';
    castBtn.className = 'arcade-btn';
    castBtn.id = 'arcade-toggle';
    castBtn.innerHTML = `${svg(ICON.joy)}<span>${labels.cast}</span>`;

    const hammerBtn = document.createElement('button');
    hammerBtn.type = 'button';
    hammerBtn.className = 'arcade-btn';
    hammerBtn.id = 'hammer-toggle';
    hammerBtn.innerHTML = `${svg(ICON.hammer)}<span>${labels.hammer}</span>`;

    const syncCast = () => {
      castBtn.setAttribute('aria-pressed', String(arcadeOn));
      castBtn.setAttribute('aria-label', arcadeOn ? labels.castOn : labels.castOff);
    };
    const syncHammer = () => {
      hammerBtn.setAttribute('aria-pressed', String(hammerOn));
      hammerBtn.setAttribute('aria-label', hammerOn ? labels.hammerOn : labels.hammer);
      document.body.classList.toggle('hammer-on', hammerOn);
    };

    castBtn.addEventListener('click', () => {
      arcadeOn = !arcadeOn;
      try { localStorage.setItem('arcade:on', arcadeOn ? '1' : '0'); } catch {}
      if (!arcadeOn) cast.length = 0;
      syncCast();
      kick();
    });

    hammerBtn.addEventListener('click', () => {
      hammerOn = !hammerOn;
      syncHammer();
      // Picking the hammer back up sends the janitor away mid-pass - it is here
      // to clean up after you, not to sweep under an active hammer. Whatever it
      // hadn't reached stays on the floor until the next time you put it down.
      if (hammerOn) sweep = null;
      else restoreAll();
      if (hammerOn) showBubble();
      else hideBubble();
      kick();
    });

    controls.append(castBtn, hammerBtn);
    if (bubbleText) {
      hammerBubble = makeHammerBubble(bubbleText);
      controls.appendChild(hammerBubble);
    }
    document.body.appendChild(controls);
    syncCast();
    syncHammer();
  }

  /* ---------- loop ---------- */

  function busy() {
    return arcadeOn || particles.length > 0 || wordArts.length > 0 ||
           shocks.length > 0 || restoring || sweep != null;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0);
    lastT = now;

    if (arcadeOn && !document.hidden) {
      platformTimer -= dt;
      if (platformTimer <= 0) { platformTimer = 0.4; refreshPlatforms(); }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTimer = 1.4 + Math.random() * 3.2;
        ensureGroundCrew(); // brings back anyone who got smashed
        ensureMuncher();
        ensureLemmings();
        spawn();
      }
      stepCast(dt);
    }
    stepParticles(dt);
    stepSweep(dt);
    stepWordArts(dt);
    stepShocks(dt);

    bgCtx.clearRect(0, 0, innerWidth, innerHeight);
    fxCtx.clearRect(0, 0, innerWidth, innerHeight);
    if (arcadeOn) drawCast();
    if (particles.length) drawParticles();
    if (sweep) drawSweep();
    if (wordArts.length) drawWordArts();
    if (shocks.length) drawShocks();

    rafId = busy() ? requestAnimationFrame(frame) : null;
  }

  function kick() {
    if (!ready) return;
    if (rafId == null && busy()) {
      lastT = performance.now();
      rafId = requestAnimationFrame(frame);
    }
  }

  /* ---------- init ---------- */

  function init() {
    if (reduced) return; // the entire feature is motion

    const cfg = (typeof SITE_CONTENT !== 'undefined' && SITE_CONTENT.arcade) || {};
    if (cfg.enabled === false) return;

    maxCast = DENSITY[cfg.density] || DENSITY.normal;
    if (innerWidth < 861) maxCast = Math.max(2, maxCast - 2);

    try {
      const saved = localStorage.getItem('arcade:on');
      if (saved !== null) arcadeOn = saved === '1';
    } catch {}

    bgCanvas = makeCanvas('arcade-bg');
    fxCanvas = makeCanvas('arcade-fx');
    bgCtx = bgCanvas.getContext('2d');
    fxCtx = fxCanvas.getContext('2d');
    sizeCanvases();

    buildControls(cfg.labels || {
      cast: 'דמויות', castOn: 'הדמויות פעילות', castOff: 'הדמויות כבויות',
      hammer: 'פטיש', hammerOn: 'הפטיש פעיל',
    }, cfg.hammerBubble);

    addEventListener('resize', () => {
      sizeCanvases();
      if (innerWidth < 861) maxCast = Math.max(2, (DENSITY[cfg.density] || 4) - 2);
      else maxCast = DENSITY[cfg.density] || DENSITY.normal;
      // The floor moved, and on mobile the tab bar changes the clearance.
      for (const s of cast) {
        if (s.state === 'lemming') {
          // The layout just moved under it. Nothing to reposition - the support
          // check re-derives from the new platform list next frame and it either
          // keeps walking or opens the umbrella - but it must stay on screen.
          s.x = Math.max(2, Math.min(s.x, innerWidth - s.w - 2));
          s.y = Math.min(s.y, groundY(s.h));
          continue;
        }
        if (s.state === 'munch') {
          // Its lane may now be below the floor, or off the right edge.
          s.lane = Math.min(s.lane, groundY(s.h));
          s.y = Math.min(s.y, groundY(s.h));
          if (s.entered) s.x = Math.min(s.x, Math.max(4, innerWidth - s.w - 4));
          continue;
        }
        if (s.state !== 'ground') continue;
        s.groundY = groundY(s.h);
        if (s.vy === 0) s.y = s.groundY;
        s.x = Math.min(s.x, Math.max(4, innerWidth - s.w - 4));
      }
    }, { passive: true });

    if (finePointer) {
      addEventListener('pointermove', (e) => {
        pointer.x = e.clientX; pointer.y = e.clientY;
      }, { passive: true });
    }

    // Hammer runs in the capture phase so smashing a tab doesn't also navigate.
    document.addEventListener('click', (e) => {
      if (!hammerOn) return;
      if (e.target.closest('.arcade-ctl')) return;

      // Floating rules are drawn above everything, so they get first refusal.
      const rule = hitTestWordArts(e.clientX, e.clientY);
      if (rule !== -1) {
        e.preventDefault();
        e.stopPropagation();
        breakWordArt(rule);
        kick();
        return;
      }

      // Characters are tested next: they're small and drawn behind the page,
      // so if one is under the cursor that's plainly what you were aiming at.
      const hit = hitTestCast(e.clientX, e.clientY);
      if (hit !== -1) {
        e.preventDefault();
        e.stopPropagation();
        hitCast(hit, e.clientX, e.clientY);
        kick();
        return;
      }

      const el = e.target.closest(BREAKABLE);
      if (!el || el.closest('.arcade-ctl')) return;
      e.preventDefault();
      e.stopPropagation();
      // Shockwaves are viewport-space (they live ~0.3s, so scrolling is moot).
      if (smash(el)) {
        shock(e.clientX, e.clientY);
        kick();
      }
    }, true);

    // Characters react to where you pressed.
    document.addEventListener('click', (e) => {
      if (hammerOn || !arcadeOn) return;
      reactTo(e.clientX, e.clientY);
      kick();
    });

    document.addEventListener('visibilitychange', kick);
    ready = true;
    // Only when the layer is actually on - otherwise a visitor who switched
    // the characters off still gets the bottom crew back on every reload.
    if (arcadeOn) {
      refreshPlatforms();
      ensureGroundCrew();
      ensureMuncher();
      ensureLemmings();   // needs the platform list above
    }
    kick();
  }

  // Anchors move when the tab changes; nothing to recompute, but stale peekers
  // would hang off the old layout, so clear them.
  function onRouteChange() {
    if (!ready) return;
    for (let i = cast.length - 1; i >= 0; i--) {
      if (cast[i].state === 'peek') cast.splice(i, 1);
    }
    kick();
  }

  return {
    init, onRouteChange, reduced,
    // exposed for tests
    _state: () => ({
      cast: cast.length, particles: particles.length, wordArts: wordArts.length,
      litter: particles.filter(isLitter).length, sweeping: sweep != null,
      smashed: smashed.size, arcadeOn, hammerOn, running: rafId != null,
    }),
    _boxes: () => cast.map((s) => ({ name: s.name, x: s.x, y: s.y, w: s.w, h: s.h })),
    _names: () => Object.keys(SPRITES),
    _build: buildSprite,
    _frames: (n) => framesOf(SPRITES[n]).length,
    _frameFor: frameFor,
    _platforms: () => platforms.map((p) => ({ top: Math.round(p.top), left: Math.round(p.left), right: Math.round(p.right) })),
    _cat: () => cast.find((s) => s.name === 'cat'),
    _munch: () => cast.find((s) => s.name === 'muncher'),
    _lemmings: () => cast.filter((s) => s.name === 'lemming'),
    _spawnNamed: (name) => {
      const s = buildSprite(name);
      cast.push({
        name, w: s.w, h: s.h, face: 1, bob: 0, life: 0, anim: 0,
        vx: 0, vy: 0, hop: 0,
        state: 'stroll', resting: true, pause: 99, hold: 0, dead: false,
        dying: false, dieT: 0,
        x: innerWidth / 2, y: innerHeight / 2,
      });
      kick();
      return cast[cast.length - 1];
    },
    _hit: (i) => {
      const r = hitCast(i, cast[i].x + cast[i].w / 2, cast[i].y + cast[i].h / 2);
      kick();
      return r;
    },
  };
})();
