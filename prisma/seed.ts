// prisma/seed.ts
import dotenv from 'dotenv';
dotenv.config();

import crypto from 'node:crypto';

import { PrismaClient, QuestionType } from '@prisma/client';
import { seedQuizzes } from './seed-quiz';
import bcrypt from 'bcrypt';

/** Retourne abandon/afk aléatoirement pour un joueur non-gagnant */
function randomLeaveFlags(isWinner: boolean): { abandon: boolean; afk: boolean } {
    if (isWinner) return { abandon: false, afk: false };
    const r = Math.random();
    if (r < 0.10) return { abandon: true, afk: false };
    if (r < 0.16) return { abandon: false, afk: true };
    return { abandon: false, afk: false };
}

function computeUnoScore(rank: number) {
    if (rank === 1) return Math.floor(Math.random() * 60) + 20; // 20–80 pts (sum of opponents' cards)
    return 0;
}

const prisma = new PrismaClient();

async function main() {
    console.log('1 - entrée dans main');
    console.log('🌱 Début du seed...');

    // ─── 1. Nettoyage ─────────────────────────────────────────────────────────
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.word.deleteMany();

    // ─── 2. Catégories ────────────────────────────────────────────────────────
    const cultureGenerale = await prisma.category.create({ data: { name: 'Culture Générale', slug: 'culture-generale' } });
    const sciences = await prisma.category.create({ data: { name: 'Sciences', slug: 'sciences' } });
    const sports = await prisma.category.create({ data: { name: 'Sports', slug: 'sports' } });
    const artsCulture = await prisma.category.create({ data: { name: 'Arts & Culture', slug: 'arts-culture' } });
    const technologie = await prisma.category.create({ data: { name: 'Technologie', slug: 'technologie' } });
    const popCulture = await prisma.category.create({ data: { name: 'Pop culture', slug: 'pop-culture' } });
    const musique = await prisma.category.create({ data: { name: 'Musique', slug: 'musique' } });
    const videogames = await prisma.category.create({ data: { name: 'Jeu Vidéo', slug: 'jeu-video' } });
    const other = await prisma.category.create({ data: { name: 'Autre', slug: 'autre' } });

    console.log('✅ Catégories créées');

    // ─── 3. Utilisateurs ──────────────────────────────────────────────────────
    const defaultPasswordHash = await bcrypt.hash('123456', 10);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@quiz.app' },
        update: {},
        create: { email: 'admin@quiz.app', username: 'Admin', role: 'ADMIN', passwordHash: defaultPasswordHash },
    });
    const randomUser = await prisma.user.upsert({
        where: { email: 'random@quiz.app' },
        update: {},
        create: { email: 'random@quiz.app', username: 'Bot🤖', role: 'RANDOM', passwordHash: defaultPasswordHash },
    });

    const user = await prisma.user.upsert({
        where: { email: 'user@quiz.app' },
        update: {},
        create: { email: 'user@quiz.app', username: 'User', role: 'USER', passwordHash: defaultPasswordHash },
    });
    const [user1, user2, user3, user4, user5, user6, user7, user8, user9, user10] = await Promise.all(
        Array.from({ length: 10 }, (_, i) => prisma.user.upsert({
            where: { email: `user${i + 1}@quiz.app` },
            update: {},
            create: { email: `user${i + 1}@quiz.app`, username: `User${i + 1}`, role: 'USER', passwordHash: defaultPasswordHash },
        }))
    );
    const farosUser = await prisma.user.upsert({
        where: { email: 'faros@quiz.app' },
        update: {},
        create: { email: 'faros@quiz.app', username: 'Faros', role: 'USER', passwordHash: defaultPasswordHash },
    });

    console.log(`✅ Utilisateur créé: ${adminUser.username}`);
    console.log(`✅ Utilisateur créé: ${randomUser.username}`);
    console.log(`✅ Utilisateur créé: ${user1.username}`);
    console.log(`✅ Utilisateur créé: ${user2.username}`);
    console.log(`✅ Utilisateur créé: ${user3.username}`);
    console.log(`✅ Utilisateur créé: ${user4.username}`);
    console.log(`✅ Utilisateur créé: ${user5.username}`);
    console.log(`✅ Utilisateur créé: ${user6.username}`);
    console.log(`✅ Utilisateur créé: ${user7.username}`);
    console.log(`✅ Utilisateur créé: ${user8.username}`);
    console.log(`✅ Utilisateur créé: ${user9.username}`);
    console.log(`✅ Utilisateur créé: ${user10.username}`);
    console.log(`✅ Utilisateur créé: ${farosUser.username}`);

    // ─── 3. MOTS ────────────────────────────────────────────────────────
    const words = [
        'ÉLÉPHANT', 'GIRAFE', 'CROCODILE', 'PINGOUIN', 'DAUPHIN', 'PANTHÈRE', 'FLAMANT', 'KANGOUROU',
        'CAMÉLÉON', 'HIPPOPOTAME', 'AUTRUCHE', 'PERROQUET', 'SCORPION', 'PIEUVRE', 'BALEINE',
        'PARAPLUIE', 'TÉLESCOPE', 'MICROSCOPE', 'ACCORDÉON', 'TRAMPOLINE', 'ESCALATOR', 'BOUILLOIRE',
        'LAMPADAIRE', 'FRIGO', 'ASPIRATEUR', 'CALCULATRICE', 'CHRONOMÈTRE', 'THERMOMÈTRE',
        'BIBLIOTHÈQUE', 'AQUARIUM', 'VOLCAN', 'DÉSERT', 'GLACIER', 'PHARE', 'CATHÉDRALE', 'CASINO',
        'STADE', 'CIRQUE', 'CIMETIÈRE', 'LABORATOIRE', 'OBSERVATOIRE', 'MANÈGE',
        'GRAVITÉ', 'DÉMOCRATIE', 'RENAISSANCE', 'RÉVOLUTION', 'PHOTOSYNTHÈSE', 'HIBERNATION',
        'MIGRATION', 'ÉVOLUTION', 'INFLATION', 'PANDÉMIE', 'PROPHÉTIE', 'PARADOXE',
        'ARCHÉOLOGUE', 'ASTRONAUTE', 'POMPIER', 'VÉTÉRINAIRE', 'SOMMELIER', 'CARTOGRAPHE',
        'CHORÉGRAPHE', 'MARIONNETTISTE', 'APICULTEUR', 'PLONGEUR', 'GLACIOLOGUE',
        'SKATEBOARD', 'PARACHUTE', 'PLANCHE À VOILE', 'BOOMERANG', 'CALLIGRAPHIE',
        'ORIGAMI', 'ESCALADE', 'ESCRIME', 'BOXE', 'NATATION', 'MARATHON',
        'GUACAMOLE', 'CROISSANT', 'FONDUE', 'SUSHI', 'RAVIOLI', 'MACARON', 'SOUFFLÉ', 'CRÊPE',
        'COUSCOUS', 'PAELLA', 'TIRAMISU', 'ÉCLAIR', 'MADELEINE',
    ];
    for (const word of words) {
        await prisma.word.upsert({
            where: { word },
            update: {},
            create: { word },
        });
    }
    console.log(`✅ ${words.length} mots ajoutés.`);

    // ─── 5. Quiz  ─────────────────────────────────────────────────────────────

    await seedQuizzes(prisma, randomUser.id, {
        cultureGenerale,
        sciences,
        sports,
        artsCulture,
        technologie,
        popCulture,
        musique,
        videogames,
        other
    });




    // ─── 5. Attempts Quiz ─────────────────────────────────────────────────────
    console.log('\n🎮 Création des attempts Quiz...');

    const allQuizzes = await prisma.quiz.findMany({
        select: { id: true, questions: { select: { points: true } } }
    });

    const getMaxScore = (quiz: typeof allQuizzes[0]) => quiz.questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0)
    const getRandScore = (max: number) => Math.floor(Math.random() * (max + 1));
    const getDaysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    function shufflePlayers<T>(arr: T[]): T[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    const shuffle = (arr: typeof allQuizzes) => arr.sort(() => Math.random() - 0.5);
    const farosQuizzes = shuffle([...allQuizzes]).slice(0, 20);
    const user1Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const user2Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const user3Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const user4Quizzes = shuffle([...allQuizzes]).slice(0, 20);
    const user5Quizzes = shuffle([...allQuizzes]).slice(0, 20);

    for (const [quizzes, userId] of [
        [farosQuizzes, farosUser.id],
        [user1Quizzes, user1.id],
        [user2Quizzes, user2.id],
        [user3Quizzes, user3.id],
        [user4Quizzes, user4.id],
        [user5Quizzes, user5.id],
    ] as [typeof farosQuizzes, string][]) {
        for (const quiz of quizzes) {
            const totalAnswers = quiz.questions.length;
            const maxScore = getMaxScore(quiz);
            const score = getRandScore(maxScore);
            // Approximation : nb de bonnes réponses proportionnel au score (avec un peu de bruit)
            const correctAnswers = totalAnswers > 0 && maxScore > 0
                ? Math.round((score / maxScore) * totalAnswers)
                : 0;
            await prisma.attempt.create({
                data: { userId, quizId: quiz.id, score, gameType: 'QUIZ', gameId: crypto.randomUUID(), createdAt: getDaysAgo(Math.floor(Math.random() * 30)), correctAnswers, totalAnswers },
            });
        }
    }

    console.log('✅ 20 attempts Quiz créés pour Faros, User1, User2, User3, User4 et User5');

    // ─── 6. Parties UNO ───────────────────────────────────────────────────────
    console.log('\n🎴 Création des parties UNO...');

    const unoPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8];
    const totalUnoGames = 80;
    const unoGameDates: Date[] = [];

    for (let g = 0; g < totalUnoGames; g++) {
        const baseDaysAgo = Math.floor((g / totalUnoGames) * 120);
        const jitterHours = Math.floor(Math.random() * 48);
        unoGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    unoGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalUnoGames; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (unoPlayers.length - 1)) + 2;
        const participants = shufflePlayers(unoPlayers).slice(0, playerCount);
        const rankedParticipants = shufflePlayers(participants);
        const gameDate = unoGameDates[g];

        for (let p = 0; p < rankedParticipants.length; p++) {
            const isWinner = p === 0;
            const { abandon, afk } = randomLeaveFlags(isWinner);
            await prisma.attempt.create({
                data: {
                    userId: rankedParticipants[p].id,
                    score: computeUnoScore(p + 1),
                    gameType: 'UNO',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    abandon,
                    afk,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie UNO ${g + 1}/${totalUnoGames} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${totalUnoGames} parties UNO créées`);

    // ─── 7. Parties SKYJOW ────────────────────────────────────────────────────
    console.log('\n🂠 Création des parties Skyjow...');

    const skyjowPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8];
    const totalSkyjowGames = 60;
    const skyjowGameDates: Date[] = [];

    for (let g = 0; g < totalSkyjowGames; g++) {
        const baseDaysAgo = Math.floor((g / totalSkyjowGames) * 90);
        const jitterHours = Math.floor(Math.random() * 24);
        skyjowGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    skyjowGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalSkyjowGames; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (skyjowPlayers.length - 1)) + 2;
        const participants = shufflePlayers(skyjowPlayers).slice(0, playerCount);
        const gameDate = skyjowGameDates[g];

        const scores: number[] = participants.map(() => Math.floor(Math.random() * 45) + 5);
        // Si le déclencheur de fin de manche n'est pas le meilleur, son score est doublé
        const minScore = Math.min(...scores);
        const triggerIndex = participants.length - 1;
        if (scores[triggerIndex] !== minScore) {
            scores[triggerIndex] = Math.min(scores[triggerIndex] * 2, 120);
        }
        // Placement par score croissant (le plus bas gagne)
        const placements = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
        const rankOf = new Array(participants.length);
        placements.forEach((originalIdx, rank) => { rankOf[originalIdx] = rank + 1; });

        for (let p = 0; p < participants.length; p++) {
            const { abandon, afk } = randomLeaveFlags(rankOf[p] === 1);
            await prisma.attempt.create({
                data: {
                    userId: participants[p].id,
                    score: scores[p],
                    gameType: 'SKYJOW',
                    placement: rankOf[p],
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    abandon,
                    afk,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Skyjow ${g + 1}/${totalSkyjowGames} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${totalSkyjowGames} parties Skyjow créées`);

    // ─── 8. Parties TABOO ────────────────────────────────────────────────────
    console.log('\n🗣️ Création des parties Taboo...');

    const tabooPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
    const totalTabooGames = 20;
    const tabooGameDates: Date[] = [];

    for (let g = 0; g < totalTabooGames; g++) {
        const baseDaysAgo = Math.floor((g / totalTabooGames) * 90);
        const jitterHours = Math.floor(Math.random() * 24);
        tabooGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    tabooGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalTabooGames; g++) {
        const gameId = crypto.randomUUID();
        const gameDate = tabooGameDates[g];

        const playerCount = Math.floor(Math.random() * (tabooPlayers.length - 3)) + 4; // 4 à 7 joueurs
        const participants = shufflePlayers(tabooPlayers).slice(0, Math.min(playerCount, tabooPlayers.length));
        const teamA = participants.slice(0, Math.ceil(participants.length / 2));
        const teamB = participants.slice(Math.ceil(participants.length / 2));

        const totalRounds = Math.floor(Math.random() * 3) + 2; // 2-4 rounds
        let scoreA = 0, scoreB = 0, trapA = 0, trapB = 0;

        for (let r = 0; r < totalRounds; r++) {
            // Manche A : 0 ou 1 point — soit équipe A devine (scoreA+1), soit équipe B piège (trapB+1), soit rien
            const randA = Math.random();
            if (randA < 0.55) { scoreA += 1; }        // mot deviné par A
            else if (randA < 0.75) { scoreB += 1; trapB += 1; } // mot piégé par B

            // Manche B : idem
            const randB = Math.random();
            if (randB < 0.55) { scoreB += 1; }        // mot deviné par B
            else if (randB < 0.75) { scoreA += 1; trapA += 1; } // mot piégé par A
        }

        // Placement final — un seul attempt par joueur à la fin de la partie
        const winnerTeam = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null;

        for (let p = 0; p < participants.length; p++) {
            const player = participants[p];
            const isTeamA = teamA.includes(player);
            const myScore = isTeamA ? scoreA : scoreB;
            const myTrapScore = isTeamA ? trapA : trapB;
            const myTeamKey = isTeamA ? 'A' : 'B';
            const placement = winnerTeam === null ? null : myTeamKey === winnerTeam ? 1 : 2;

            const { abandon, afk } = randomLeaveFlags(placement === 1);
            await prisma.attempt.create({
                data: {
                    userId: player.id,
                    score: myScore,
                    trapScore: myTrapScore,
                    rounds: totalRounds,
                    gameType: 'TABOO',
                    placement,
                    gameId,
                    quizId: null,
                    abandon,
                    afk,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }

        console.log(`  ✅ Partie Taboo ${g + 1}/${totalTabooGames} — A: ${scoreA}pts (trap:${trapA}) · B: ${scoreB}pts (trap:${trapB}) — gagnant: ${winnerTeam ?? 'nul'} — ${totalRounds} manches`);
    }
    console.log(`✅ ${totalTabooGames} parties Taboo créées`);


    // ─── 9. Parties YAHTZEE ───────────────────────────────────────────────────
    console.log('\n🎲 Création des parties Yahtzee...');

    const yahtzeePlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8];
    const totalYahtzeeGames = 50;
    const yahtzeeGameDates: Date[] = [];

    for (let g = 0; g < totalYahtzeeGames; g++) {
        const baseDaysAgo = Math.floor((g / totalYahtzeeGames) * 100);
        const jitterHours = Math.floor(Math.random() * 36);
        yahtzeeGameDates.push(new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000));
    }
    yahtzeeGameDates.sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < totalYahtzeeGames; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (yahtzeePlayers.length - 1)) + 2;
        const participants = shufflePlayers(yahtzeePlayers).slice(0, playerCount);
        const gameDate = yahtzeeGameDates[g];

        // Score Yahtzee réaliste : entre 100 et 375 pts
        const scores = participants.map(() => Math.floor(Math.random() * 275) + 100);

        // Classement basé sur le score (plus haut = meilleur)
        const ranked = [...participants]
            .map((player, i) => ({ player, score: scores[i] }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            const { abandon, afk } = randomLeaveFlags(p === 0);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id,
                    score: ranked[p].score,
                    gameType: 'YAHTZEE',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    abandon,
                    afk,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Yahtzee ${g + 1}/${totalYahtzeeGames} — ${playerCount} joueurs — scores: ${ranked.map(r => r.score).join(', ')}`);
    }
    console.log(`✅ ${totalYahtzeeGames} parties Yahtzee créées`);

    // ─── 10. Parties PUISSANCE4 ───────────────────────────────────────────────
    console.log('\n🔴 Création des parties Puissance 4...');

    const p4Players = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8];
    const totalP4Games = 30;

    for (let g = 0; g < totalP4Games; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalP4Games) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const shuffled = shufflePlayers(p4Players);
        const player1 = shuffled[0];
        const player2 = shuffled[1];

        const isDraw = Math.random() < 0.15; // 15% de nuls
        const winnerIndex = Math.random() < 0.5 ? 0 : 1;
        const players = [player1, player2];

        for (let p = 0; p < 2; p++) {
            const isWinner = !isDraw && p === winnerIndex;
            await prisma.attempt.create({
                data: {
                    userId: players[p].id,
                    score: isWinner ? 10 : 0,
                    gameType: 'PUISSANCE4',
                    placement: isDraw ? null : (isWinner ? 1 : 2),
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie P4 ${g + 1}/${totalP4Games} — ${player1.username} vs ${player2.username} — ${isDraw ? 'Nul' : `${players[winnerIndex].username} gagne`}`);
    }
    console.log(`✅ ${totalP4Games} parties Puissance 4 créées`);

    // ─── 11. Parties JUST ONE ─────────────────────────────────────────────────
    console.log('\n🔤 Création des parties Just One...');

    const justOnePlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8];
    const totalJustOneGames = 35;

    for (let g = 0; g < totalJustOneGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalJustOneGames) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const playerCount = Math.floor(Math.random() * 5) + 3; // 3 à 7 joueurs
        const participants = shufflePlayers(justOnePlayers).slice(0, Math.min(playerCount, justOnePlayers.length));

        // Score coopératif : mots devinés sur 13
        const score = Math.floor(Math.random() * 10) + 3; // 3 à 12

        for (let p = 0; p < participants.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: participants[p].id,
                    score,
                    gameType: 'JUST_ONE',
                    placement: null,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Just One ${g + 1}/${totalJustOneGames} — ${participants.length} joueurs — score: ${score}/13`);
    }
    console.log(`✅ ${totalJustOneGames} parties Just One créées`);

    // ─── 12. Parties BATTLESHIP ───────────────────────────────────────────────
    console.log('\n🚢 Création des parties Bataille Navale...');

    const battleshipPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
    const totalBattleshipGames = 30;

    for (let g = 0; g < totalBattleshipGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalBattleshipGames) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const shuffled = shufflePlayers(battleshipPlayers);
        const player1 = shuffled[0];
        const player2 = shuffled[1];
        const winnerIndex = Math.random() < 0.5 ? 0 : 1;
        const players = [player1, player2];

        for (let p = 0; p < 2; p++) {
            const isWinner = p === winnerIndex;
            await prisma.attempt.create({
                data: {
                    userId: players[p].id,
                    score: isWinner ? 10 : 0,
                    gameType: 'BATTLESHIP',
                    placement: isWinner ? 1 : 2,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Battleship ${g + 1}/${totalBattleshipGames} — ${player1.username} vs ${player2.username} — gagnant: ${players[winnerIndex].username}`);
    }
    console.log(`✅ ${totalBattleshipGames} parties Bataille Navale créées`);

    // ─── 13. Parties DIAMANT ──────────────────────────────────────────────────
    console.log('\n💎 Création des parties Diamant...');

    const diamantPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
    const totalDiamantGames = 40;

    for (let g = 0; g < totalDiamantGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalDiamantGames) * 70);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const playerCount = Math.floor(Math.random() * 5) + 2; // 2 à 6 joueurs
        const participants = shufflePlayers(diamantPlayers).slice(0, Math.min(playerCount, diamantPlayers.length));

        // Score Diamant : rubis sécurisés, entre 0 et 50, + reliques (5 pts chacune)
        const scores = participants.map(() => {
            const rubies = Math.floor(Math.random() * 45);
            const diamonds = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
            return rubies + diamonds * 5;
        });

        // Classement basé sur le score (plus haut = meilleur)
        const ranked = [...participants]
            .map((player, i) => ({ player, score: scores[i] }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            const { abandon, afk } = randomLeaveFlags(p === 0);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id,
                    score: ranked[p].score,
                    gameType: 'DIAMANT',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    abandon,
                    afk,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Diamant ${g + 1}/${totalDiamantGames} — ${playerCount} joueurs — scores: ${ranked.map(r => r.score).join(', ')}`);
    }
    console.log(`✅ ${totalDiamantGames} parties Diamant créées`);

    // ─── 14. Parties IMPOSTEUR ────────────────────────────────────────────────
    console.log('\n🎭 Création des parties Imposteur...');

    const impostorPlayers = [farosUser, user, user1, user2, user3, user4, user5, user6, user7, user8, user9, user10];
    const totalImpostorGames = 40;

    for (let g = 0; g < totalImpostorGames; g++) {
        const gameId = crypto.randomUUID();
        const baseDaysAgo = Math.floor((g / totalImpostorGames) * 60);
        const jitterHours = Math.floor(Math.random() * 24);
        const gameDate = new Date(Date.now() - baseDaysAgo * 24 * 60 * 60 * 1000 - jitterHours * 60 * 60 * 1000);

        const playerCount = Math.floor(Math.random() * 4) + 4; // 4 à 7 joueurs
        const participants = shufflePlayers(impostorPlayers).slice(0, Math.min(playerCount, impostorPlayers.length));

        // Choisir l'imposteur aléatoirement
        const impostorIndex = Math.floor(Math.random() * participants.length);
        // L'imposteur est-il éliminé ?
        const impostorCaught = Math.random() < 0.6;
        // L'imposteur devine-t-il le mot s'il perd ?
        const impostorGuesses = !impostorCaught && Math.random() < 0.4;

        const scores = participants.map((_, i) => {
            if (i === impostorIndex) {
                // Imposteur : +3 si vote échoue, +2 si devine le mot
                let score = 0;
                if (!impostorCaught) score += 3;
                if (impostorGuesses) score += 2;
                return score;
            } else {
                // Joueur normal : +2 si imposteur éliminé, +1 si a bien voté
                let score = 0;
                if (impostorCaught) score += 2;
                if (impostorCaught && Math.random() < 0.75) score += 1; // a bien voté
                return score;
            }
        });

        // Classement : plus haut score = meilleure place
        const ranked = participants
            .map((player, i) => ({ player, score: scores[i] }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            const { abandon, afk } = randomLeaveFlags(p === 0);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id,
                    score: ranked[p].score,
                    gameType: 'IMPOSTOR',
                    placement: p + 1,
                    gameId,
                    quizId: null,
                    trapScore: 0,
                    abandon,
                    afk,
                    createdAt: new Date(gameDate.getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Partie Imposteur ${g + 1}/${totalImpostorGames} — ${playerCount} joueurs — imposteur ${impostorCaught ? 'éliminé' : 'non éliminé'}`);
    }
    console.log(`✅ ${totalImpostorGames} parties Imposteur créées`);

}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
