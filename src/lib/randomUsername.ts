const ADJECTIVES = [
    'Brave', 'Swift', 'Clever', 'Lucky', 'Bold', 'Calm', 'Dark', 'Fond', 'Kind', 'Wild',
    'Fierce', 'Mighty', 'Sly', 'Noble', 'Agile', 'Cunning', 'Daring', 'Epic', 'Frosty', 'Grim',
    'Happy', 'Iron', 'Jade', 'Keen', 'Lone', 'Mad', 'Neon', 'Odd', 'Proud', 'Quick',
    'Rogue', 'Sharp', 'Tense', 'Ultra', 'Vivid', 'Witty', 'Xtra', 'Young', 'Zany', 'Slick',
    'Rusty', 'Shiny', 'Tiny', 'Giant', 'Silent', 'Loud', 'Fuzzy', 'Spiky', 'Royal', 'Cosmic',
    'Solar', 'Lunar', 'Stormy', 'Frozen', 'Blazing', 'Salty', 'Dusty', 'Mystic', 'Turbo', 'Hyper',
];
const NOUNS = [
    'Panda', 'Fox', 'Eagle', 'Wolf', 'Tiger', 'Bear', 'Hawk', 'Lion', 'Lynx', 'Raven',
    'Cobra', 'Falcon', 'Jaguar', 'Manta', 'Otter', 'Panther', 'Quail', 'Rhino', 'Shark', 'Viper',
    'Walrus', 'Yak', 'Zebra', 'Bison', 'Crane', 'Dingo', 'Ferret', 'Gecko', 'Hyena', 'Iguana',
    'Koala', 'Lemur', 'Moose', 'Narwhal', 'Osprey', 'Parrot', 'Quokka', 'Raccoon', 'Sloth', 'Tapir',
    'Urubu', 'Vulture', 'Wombat', 'Xerus', 'Zorilla', 'Badger', 'Capybara', 'Dodo', 'Emu', 'Flamingo',
    'Gorilla', 'Hamster', 'Impala', 'Jackal', 'Kestrel', 'Lobster', 'Mammoth', 'Newt', 'Ocelot', 'Platypus',
];

export function randomUsername(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 9000 + 1000);
    return `${adj}${noun}${num}`;
}
