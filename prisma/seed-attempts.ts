import crypto from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma/client';

type UserLike = { id: string; username: string | null };

function randomLeaveFlags(isWinner: boolean): { abandon: boolean; afk: boolean } {
    if (isWinner) return { abandon: false, afk: false };
    const r = Math.random();
    if (r < 0.10) return { abandon: true, afk: false };
    if (r < 0.16) return { abandon: false, afk: true };
    return { abandon: false, afk: false };
}

function shufflePlayers<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function daysAgo(days: number, jitterHours = 0): Date {
    return new Date(Date.now() - days * 86_400_000 - jitterHours * 3_600_000);
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export async function seedQuizAttempts(
    prisma: PrismaClient,
    users: { faros: UserLike; user1: UserLike; user2: UserLike; user3: UserLike; user4: UserLike; user5: UserLike },
) {
    console.log('\n🎮 Création des attempts Quiz...');

    const allQuizzes = await prisma.quiz.findMany({
        select: { id: true, questions: { select: { points: true } } },
    });

    const getMaxScore = (quiz: typeof allQuizzes[0]) =>
        quiz.questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0);
    const getRandScore = (max: number) => Math.floor(Math.random() * (max + 1));
    const shuffle = (arr: typeof allQuizzes) => [...arr].sort(() => Math.random() - 0.5);

    const entries = [
        users.faros, users.user1, users.user2, users.user3, users.user4, users.user5,
    ];

    for (const u of entries) {
        const quizzes = shuffle(allQuizzes).slice(0, 20);
        for (const quiz of quizzes) {
            const totalAnswers = quiz.questions.length;
            const maxScore = getMaxScore(quiz);
            const score = getRandScore(maxScore);
            const correctAnswers = totalAnswers > 0 && maxScore > 0
                ? Math.round((score / maxScore) * totalAnswers)
                : 0;
            await prisma.attempt.create({
                data: {
                    userId: u.id, quizId: quiz.id, score,
                    gameType: 'QUIZ', gameId: crypto.randomUUID(),
                    createdAt: daysAgo(Math.floor(Math.random() * 30)),
                    correctAnswers, totalAnswers,
                },
            });
        }
    }

    console.log('✅ 20 attempts Quiz créés par utilisateur');
}

// ─── UNO ──────────────────────────────────────────────────────────────────────

export async function seedUnoAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🎴 Création des parties UNO...');
    const total = 80;

    const dates = Array.from({ length: total }, (_, g) =>
        daysAgo(Math.floor((g / total) * 120), Math.floor(Math.random() * 48))
    ).sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (players.length - 1)) + 2;
        const participants = shufflePlayers(players).slice(0, playerCount);
        const ranked = shufflePlayers(participants);

        for (let p = 0; p < ranked.length; p++) {
            const isWinner = p === 0;
            const { abandon, afk } = randomLeaveFlags(isWinner);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].id,
                    score: isWinner ? Math.floor(Math.random() * 60) + 20 : 0,
                    gameType: 'UNO', placement: p + 1,
                    gameId, quizId: null, trapScore: 0,
                    abandon, afk,
                    createdAt: new Date(dates[g].getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ UNO ${g + 1}/${total} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${total} parties UNO créées`);
}

// ─── SKYJOW ───────────────────────────────────────────────────────────────────

export async function seedSkyjowAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🂠 Création des parties Skyjow...');
    const total = 60;

    const dates = Array.from({ length: total }, (_, g) =>
        daysAgo(Math.floor((g / total) * 90), Math.floor(Math.random() * 24))
    ).sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (players.length - 1)) + 2;
        const participants = shufflePlayers(players).slice(0, playerCount);
        const scores = participants.map(() => Math.floor(Math.random() * 45) + 5);

        const minScore = Math.min(...scores);
        const triggerIndex = participants.length - 1;
        if (scores[triggerIndex] !== minScore) scores[triggerIndex] = Math.min(scores[triggerIndex] * 2, 120);

        const rankOf = new Array(participants.length);
        [...scores.keys()].sort((a, b) => scores[a] - scores[b]).forEach((origIdx, rank) => {
            rankOf[origIdx] = rank + 1;
        });

        for (let p = 0; p < participants.length; p++) {
            const { abandon, afk } = randomLeaveFlags(rankOf[p] === 1);
            await prisma.attempt.create({
                data: {
                    userId: participants[p].id, score: scores[p],
                    gameType: 'SKYJOW', placement: rankOf[p],
                    gameId, quizId: null, trapScore: 0,
                    abandon, afk,
                    createdAt: new Date(dates[g].getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Skyjow ${g + 1}/${total} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${total} parties Skyjow créées`);
}

// ─── TABOO ────────────────────────────────────────────────────────────────────

export async function seedTabooAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🗣️ Création des parties Taboo...');
    const total = 20;

    const dates = Array.from({ length: total }, (_, g) =>
        daysAgo(Math.floor((g / total) * 90), Math.floor(Math.random() * 24))
    ).sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.min(Math.floor(Math.random() * (players.length - 3)) + 4, players.length);
        const participants = shufflePlayers(players).slice(0, playerCount);
        const teamA = participants.slice(0, Math.ceil(participants.length / 2));
        const teamB = participants.slice(Math.ceil(participants.length / 2));

        const totalRounds = Math.floor(Math.random() * 3) + 2;
        let scoreA = 0, scoreB = 0, trapA = 0, trapB = 0;

        for (let r = 0; r < totalRounds; r++) {
            const rA = Math.random();
            if (rA < 0.55) { scoreA++; }
            else if (rA < 0.75) { scoreB++; trapB++; }

            const rB = Math.random();
            if (rB < 0.55) { scoreB++; }
            else if (rB < 0.75) { scoreA++; trapA++; }
        }

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
                    userId: player.id, score: myScore, trapScore: myTrapScore,
                    rounds: totalRounds, gameType: 'TABOO', placement,
                    gameId, quizId: null, abandon, afk,
                    createdAt: new Date(dates[g].getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Taboo ${g + 1}/${total} — A:${scoreA}(trap:${trapA}) B:${scoreB}(trap:${trapB}) — gagnant:${winnerTeam ?? 'nul'}`);
    }
    console.log(`✅ ${total} parties Taboo créées`);
}

// ─── YAHTZEE ──────────────────────────────────────────────────────────────────

export async function seedYahtzeeAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🎲 Création des parties Yahtzee...');
    const total = 50;

    const dates = Array.from({ length: total }, (_, g) =>
        daysAgo(Math.floor((g / total) * 100), Math.floor(Math.random() * 36))
    ).sort((a, b) => a.getTime() - b.getTime());

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.floor(Math.random() * (players.length - 1)) + 2;
        const participants = shufflePlayers(players).slice(0, playerCount);
        const ranked = participants
            .map(player => ({ player, score: Math.floor(Math.random() * 275) + 100 }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            const { abandon, afk } = randomLeaveFlags(p === 0);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id, score: ranked[p].score,
                    gameType: 'YAHTZEE', placement: p + 1,
                    gameId, quizId: null, trapScore: 0, abandon, afk,
                    createdAt: new Date(dates[g].getTime() + p * 1000),
                },
            });
        }
        console.log(`  ✅ Yahtzee ${g + 1}/${total} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${total} parties Yahtzee créées`);
}

// ─── PUISSANCE 4 ──────────────────────────────────────────────────────────────

export async function seedPuissance4Attempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🔴 Création des parties Puissance 4...');
    const total = 30;

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const [p1, p2] = shufflePlayers(players);
        const isDraw = Math.random() < 0.15;
        const winnerIndex = Math.random() < 0.5 ? 0 : 1;
        const pair = [p1, p2];

        for (let p = 0; p < 2; p++) {
            const isWinner = !isDraw && p === winnerIndex;
            await prisma.attempt.create({
                data: {
                    userId: pair[p].id, score: isWinner ? 10 : 0,
                    gameType: 'PUISSANCE4',
                    placement: isDraw ? null : (isWinner ? 1 : 2),
                    gameId, quizId: null, trapScore: 0,
                    createdAt: daysAgo(Math.floor((g / total) * 60), Math.floor(Math.random() * 24)),
                },
            });
        }
        console.log(`  ✅ P4 ${g + 1}/${total} — ${p1.username} vs ${p2.username} — ${isDraw ? 'Nul' : pair[winnerIndex].username + ' gagne'}`);
    }
    console.log(`✅ ${total} parties Puissance 4 créées`);
}

// ─── JUST ONE ─────────────────────────────────────────────────────────────────

export async function seedJustOneAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🔤 Création des parties Just One...');
    const total = 35;

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.min(Math.floor(Math.random() * 5) + 3, players.length);
        const participants = shufflePlayers(players).slice(0, playerCount);
        const score = Math.floor(Math.random() * 10) + 3;

        for (let p = 0; p < participants.length; p++) {
            await prisma.attempt.create({
                data: {
                    userId: participants[p].id, score,
                    gameType: 'JUST_ONE', placement: null,
                    gameId, quizId: null, trapScore: 0,
                    createdAt: daysAgo(Math.floor((g / total) * 60), Math.floor(Math.random() * 24)),
                },
            });
        }
        console.log(`  ✅ Just One ${g + 1}/${total} — ${participants.length} joueurs — score:${score}/13`);
    }
    console.log(`✅ ${total} parties Just One créées`);
}

// ─── BATTLESHIP ───────────────────────────────────────────────────────────────

export async function seedBattleshipAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🚢 Création des parties Bataille Navale...');
    const total = 30;

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const [p1, p2] = shufflePlayers(players);
        const winnerIndex = Math.random() < 0.5 ? 0 : 1;
        const pair = [p1, p2];

        for (let p = 0; p < 2; p++) {
            const isWinner = p === winnerIndex;
            await prisma.attempt.create({
                data: {
                    userId: pair[p].id, score: isWinner ? 10 : 0,
                    gameType: 'BATTLESHIP', placement: isWinner ? 1 : 2,
                    gameId, quizId: null, trapScore: 0,
                    createdAt: daysAgo(Math.floor((g / total) * 60), Math.floor(Math.random() * 24)),
                },
            });
        }
        console.log(`  ✅ Battleship ${g + 1}/${total} — gagnant: ${pair[winnerIndex].username}`);
    }
    console.log(`✅ ${total} parties Bataille Navale créées`);
}

// ─── DIAMANT ──────────────────────────────────────────────────────────────────

export async function seedDiamantAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n💎 Création des parties Diamant...');
    const total = 40;

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.min(Math.floor(Math.random() * 5) + 2, players.length);
        const participants = shufflePlayers(players).slice(0, playerCount);

        const ranked = participants
            .map(player => ({
                player,
                score: Math.floor(Math.random() * 45) + (Math.random() < 0.3 ? Math.floor(Math.random() * 3) * 5 : 0),
            }))
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            const { abandon, afk } = randomLeaveFlags(p === 0);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id, score: ranked[p].score,
                    gameType: 'DIAMANT', placement: p + 1,
                    gameId, quizId: null, trapScore: 0, abandon, afk,
                    createdAt: daysAgo(Math.floor((g / total) * 70), Math.floor(Math.random() * 24)),
                },
            });
        }
        console.log(`  ✅ Diamant ${g + 1}/${total} — ${playerCount} joueurs`);
    }
    console.log(`✅ ${total} parties Diamant créées`);
}

// ─── IMPOSTOR ─────────────────────────────────────────────────────────────────

export async function seedImpostorAttempts(prisma: PrismaClient, players: UserLike[]) {
    console.log('\n🎭 Création des parties Imposteur...');
    const total = 40;

    for (let g = 0; g < total; g++) {
        const gameId = crypto.randomUUID();
        const playerCount = Math.min(Math.floor(Math.random() * 4) + 4, players.length);
        const participants = shufflePlayers(players).slice(0, playerCount);
        const impostorIndex = Math.floor(Math.random() * participants.length);
        const impostorCaught = Math.random() < 0.6;
        const impostorGuesses = !impostorCaught && Math.random() < 0.4;

        const ranked = participants
            .map((player, i) => {
                let score = 0;
                if (i === impostorIndex) {
                    if (!impostorCaught) score += 3;
                    if (impostorGuesses) score += 2;
                } else {
                    if (impostorCaught) score += 2;
                    if (impostorCaught && Math.random() < 0.75) score += 1;
                }
                return { player, score };
            })
            .sort((a, b) => b.score - a.score);

        for (let p = 0; p < ranked.length; p++) {
            const { abandon, afk } = randomLeaveFlags(p === 0);
            await prisma.attempt.create({
                data: {
                    userId: ranked[p].player.id, score: ranked[p].score,
                    gameType: 'IMPOSTOR', placement: p + 1,
                    gameId, quizId: null, trapScore: 0, abandon, afk,
                    createdAt: daysAgo(Math.floor((g / total) * 60), Math.floor(Math.random() * 24)),
                },
            });
        }
        console.log(`  ✅ Imposteur ${g + 1}/${total} — ${playerCount} joueurs — imposteur ${impostorCaught ? 'éliminé' : 'non éliminé'}`);
    }
    console.log(`✅ ${total} parties Imposteur créées`);
}
