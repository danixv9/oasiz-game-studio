export type GameCategory =
  | 'all'
  | 'arcade'
  | 'puzzle'
  | 'action'
  | 'casual'
  | 'party'
  | 'physics';

export interface Game {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  icon: string;
  gradient: readonly [string, string];
  isNew?: boolean;
  isFeatured?: boolean;
  isMultiplayer?: boolean;
}

const GAMES_BASE_URL =
  process.env.EXPO_PUBLIC_GAMES_BASE_URL || 'https://oasiz-assets.vercel.app';

export function getGameUrl(game: Game): string {
  return `${GAMES_BASE_URL}/${game.id}/`;
}

export const CATEGORIES: { key: GameCategory; label: string }[] = [
  { key: 'all', label: 'All Games' },
  { key: 'arcade', label: 'Arcade' },
  { key: 'puzzle', label: 'Puzzle' },
  { key: 'action', label: 'Action' },
  { key: 'casual', label: 'Casual' },
  { key: 'party', label: 'Party' },
  { key: 'physics', label: 'Physics' },
];

export const GAMES: Game[] = [
  {
    id: 'block-blast',
    title: 'Block Blast',
    description:
      'Place blocks strategically to clear rows and columns. How long can you survive?',
    category: 'puzzle',
    icon: '🧱',
    gradient: ['#8B5CF6', '#EC4899'],
    isFeatured: true,
  },
  {
    id: 'cannon-blaster',
    title: 'Cannon Blaster',
    description:
      'Aim, fire, and destroy targets with explosive precision.',
    category: 'arcade',
    icon: '💥',
    gradient: ['#F97316', '#EF4444'],
    isNew: true,
  },
  {
    id: 'car-balance',
    title: 'Car Balance',
    description:
      'Keep your car balanced on the beam. Physics-based challenge that tests your reflexes.',
    category: 'physics',
    icon: '🚗',
    gradient: ['#06B6D4', '#3B82F6'],
  },
  {
    id: 'draw-the-thing',
    title: 'Draw The Thing',
    description:
      'Draw and guess with friends in this hilarious multiplayer party game!',
    category: 'party',
    icon: '🎨',
    gradient: ['#10B981', '#FBBF24'],
    isMultiplayer: true,
  },
  {
    id: 'dual-block-dodge',
    title: 'Dual Block Dodge',
    description:
      'Control two blocks simultaneously. Dodge obstacles in this split-attention challenge.',
    category: 'action',
    icon: '⬛',
    gradient: ['#EF4444', '#F97316'],
  },
  {
    id: 'hoops-jump',
    title: 'Hoops Jump',
    description:
      'Time your jumps to score through the hoops. Simple to learn, impossible to master.',
    category: 'arcade',
    icon: '🏀',
    gradient: ['#F59E0B', '#F97316'],
  },
  {
    id: 'pacman',
    title: 'Pac-Man',
    description:
      'The classic maze chase game. Eat all the dots, avoid the ghosts!',
    category: 'arcade',
    icon: '👾',
    gradient: ['#FBBF24', '#F97316'],
    isFeatured: true,
  },
  {
    id: 'paddle-bounce',
    title: 'Paddle Bounce',
    description:
      'Break all the bricks with your bouncing ball. Classic arcade action with a modern twist.',
    category: 'arcade',
    icon: '🏓',
    gradient: ['#6366F1', '#8B5CF6'],
  },
  {
    id: 'paper-plane',
    title: 'Paper Plane',
    description:
      'Guide your paper plane through the sky. How far can you fly?',
    category: 'casual',
    icon: '✈️',
    gradient: ['#38BDF8', '#818CF8'],
    isNew: true,
  },
  {
    id: 'police-chase',
    title: 'Police Chase',
    description:
      'Outrun the cops in this endless high-speed chase. How long can you stay free?',
    category: 'action',
    icon: '🚔',
    gradient: ['#3B82F6', '#EF4444'],
    isFeatured: true,
  },
  {
    id: 'saw-dodge',
    title: 'Saw Dodge',
    description:
      'Dodge deadly saws in this heart-pounding survival game. One hit and you\'re done.',
    category: 'action',
    icon: '🪚',
    gradient: ['#DC2626', '#991B1B'],
  },
  {
    id: 'threes',
    title: 'Threes',
    description:
      'Slide numbered tiles to create multiples of three. A zen puzzle experience.',
    category: 'puzzle',
    icon: '3️⃣',
    gradient: ['#F43F5E', '#FB923C'],
  },
  {
    id: 'unicycle-hero',
    title: 'Unicycle Hero',
    description:
      'Balance on one wheel through increasingly wild obstacles. Are you the hero?',
    category: 'physics',
    icon: '🎪',
    gradient: ['#7C3AED', '#2563EB'],
  },
  {
    id: 'wordfall',
    title: 'Wordfall',
    description:
      'Catch falling letters to spell words before time runs out.',
    category: 'puzzle',
    icon: '📝',
    gradient: ['#6366F1', '#A855F7'],
    isNew: true,
  },
];

export function getGameById(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}

export function getGamesByCategory(category: GameCategory): Game[] {
  if (category === 'all') return GAMES;
  return GAMES.filter((g) => g.category === category);
}

export function getFeaturedGames(): Game[] {
  return GAMES.filter((g) => g.isFeatured);
}
