// Registry of games shown on the home screen.
// To add a game: create js/games/<id>.js exporting mount(root, app) -> cleanup,
// then add an entry here.

export const GAMES = [
  {
    id: 'ling6',
    name: 'Ling Sounds',
    sub: 'Listen and find!',
    color: '#ff8a5b',
    art: ['aeroplane', 'train', 'car', 'baby', 'chilli', 'lollipop'].map((n) => `assets/ling/${n}.png`),
    load: () => import('./ling6.js'),
  },
  { id: 'soon-1', name: 'Coming soon', sub: 'New game', locked: true },
  { id: 'soon-2', name: 'Coming soon', sub: 'New game', locked: true },
];
