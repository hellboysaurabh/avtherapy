// The six Ling sounds and the picture objects that stand for them.
// The sound each object stands for can be changed in the Grown-ups area.

export const LING_SOUNDS = {
  a:  { id: 'a',  label: 'aa', ipa: '/a/',  hint: 'as in "car" - aaa' },
  u:  { id: 'u',  label: 'oo', ipa: '/u/',  hint: 'as in "moon" - ooo' },
  i:  { id: 'i',  label: 'ee', ipa: '/i/',  hint: 'as in "see" - eee' },
  sh: { id: 'sh', label: 'sh', ipa: '/ʃ/',  hint: 'shhh - quiet' },
  s:  { id: 's',  label: 's',  ipa: '/s/',  hint: 'sss - hissing' },
  m:  { id: 'm',  label: 'mm', ipa: '/m/',  hint: 'mmm - yummy' },
};

export const LING_OBJECTS = [
  { id: 'aeroplane', name: 'Aeroplane', img: 'assets/ling/aeroplane.png', audio: 'assets/ling/audio/aeroplane.mp3', sound: 'a' },
  { id: 'train',     name: 'Train',     img: 'assets/ling/train.png',     audio: 'assets/ling/audio/train.mp3', sound: 'u' },
  { id: 'car',       name: 'Car',       img: 'assets/ling/car.png',       audio: 'assets/ling/audio/car.mp3', sound: 'i' },
  { id: 'baby',      name: 'Sleeping baby', img: 'assets/ling/baby.png',  audio: 'assets/ling/audio/baby.mp3', sound: 'sh' },
  { id: 'chilli',    name: 'Chilli',    img: 'assets/ling/chilli.png',    audio: 'assets/ling/audio/chilli.mp3', sound: 's' },
  { id: 'lollipop',  name: 'Lollipop',  img: 'assets/ling/lollipop.png',  audio: 'assets/ling/audio/lollipop.mp3', sound: 'm' },
];
