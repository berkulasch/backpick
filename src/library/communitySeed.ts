import { buildPlay, cut, dribble, pass, pick, shoot } from './buildPlay';
import { formationSpots } from './formations';
import { CommunityPost } from './types';

const DAY = 24 * 60 * 60 * 1000;

// Sample posts so the Community section isn't empty before there's a backend.
export function communitySeed(now = Date.now()): CommunityPost[] {
  return [
    {
      id: 'c-stagger-rip',
      name: 'Stagger rip',
      author: 'Sample coach',
      description: '2 comes off a stagger from 4 and 5 for a top-of-the-key look; 5 seals if they switch.',
      tags: ['man'],
      postedAt: now - 2 * DAY,
      play: buildPlay(formationSpots('box'), [
        [pick('o5', [27, 16]), pick('o4', [29, 22]), cut('o2', [30, 12], [32, 20], [27, 28])],
        [pass('o1', 'o2'), shoot('o2')],
      ]),
    },
    {
      id: 'c-zone-overload',
      name: 'Zone overload short corner',
      author: 'Sample coach',
      description: 'Overload the right side against a 2-3 and hit 5 flashing to the short corner.',
      tags: ['zone'],
      postedAt: now - 5 * DAY,
      play: buildPlay(formationSpots('1-4-high'), [
        [dribble('o1', [30, 30], [36, 27]), cut('o5', [27, 13], [38, 8])],
        [pass('o1', 'o5'), shoot('o5')],
      ]),
    },
    {
      id: 'c-quick-hitter',
      name: 'Horns quick hitter',
      author: 'Sample coach',
      description: 'Entry to the elbow, immediate dive by the other big. Good first look after a timeout.',
      tags: ['man', 'end-of-game'],
      postedAt: now - 9 * DAY,
      play: buildPlay(formationSpots('horns'), [[pass('o1', 'o4')], [cut('o5', [22, 12], [24, 8]), pass('o4', 'o5'), shoot('o5')]]),
    },
  ];
}
