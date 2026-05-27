// src/hooks/useJustOne.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getJustOneSocket } from '@/lib/socket';
import type { GameLogEntry } from '@/components/GameLog';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoundState = 'WAITING' | 'WRITE_CLUES' | 'VALIDATE_CLUES' | 'GUESS_PHASE' | 'RESOLUTION' | 'END_GAME';
export type Player = { id: string; name: string };
export type Clue = { playerId: string; value: string; valid: boolean };
export type RoundResult = {
    result: 'CORRECT' | 'LOST' | 'PASS';
    reason?: 'NO_VALID_CLUES' | 'WRONG_GUESS';
    score: number;
    targetWord: string;
};
export type HistoryEntry = RoundResult & { round: number };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useJustOne({
    lobbyId,
    userId,
    username,
    onNotFound,
}: {
    lobbyId: string;
    userId: string;
    username: string;
    onNotFound: () => void;
}) {
    const socket = useMemo(() => getJustOneSocket(), []);
    const joinedRef = useRef(false);
    const playersRef = useRef<Player[]>([]);

    const [players, setPlayers] = useState<Player[]>([]);
    const [guesserId, setGuesserId] = useState<string | null>(null);
    const [guesserName, setGuesserName] = useState('');
    const [roundState, setRoundState] = useState<RoundState>('WAITING');
    const [card, setCard] = useState<{ words: string[] } | null>(null);
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(0);
    const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
    const [timerDuration, setTimerDuration] = useState(60);

    const [submittedPlayers, setSubmittedPlayers] = useState<string[]>([]);
    const [cluesPerPlayer, setCluesPerPlayer] = useState(1);
    const [myClue, setMyClue] = useState('');
    const [myClue2, setMyClue2] = useState('');
    const [clueSubmitted, setClueSubmitted] = useState(false);

    const [validatedClues, setValidatedClues] = useState<Clue[]>([]);
    const [validClues, setValidClues] = useState<string[]>([]);
    const [myGuess, setMyGuess] = useState('');

    const [lastResult, setLastResult] = useState<RoundResult | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [finalScore, setFinalScore] = useState<{ score: number; level: string } | null>(null);

    const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);
    const [inactivityUserId, setInactivityUserId] = useState<string | null>(null);
    const [inactivityEndsAt, setInactivityEndsAt] = useState<number | null>(null);
    const [kickedPlayers, setKickedPlayers] = useState<{ id: string; name: string }[]>([]);
    const [log, setLog] = useState<GameLogEntry[]>([]);

    const isGuesser = guesserId === userId;

    function startTimer(seconds: number) {
        setTimerDuration(seconds);
        setTimerEndsAt(Date.now() + seconds * 1000);
    }

    function stopTimer() {
        setTimerEndsAt(null);
    }

    useEffect(() => {
        if (!socket || !lobbyId || !userId) return;
        if (joinedRef.current) return;
        joinedRef.current = true;

        socket.emit('just_one:join', { lobbyId, playerName: username, userId });

        socket.on('notFound', onNotFound);
        socket.on('just_one:players', ({ players: ps }: { players: Player[] }) => {
            playersRef.current = ps;
            setPlayers(ps);
        });
        socket.on('just_one:log', ({ log: l }: { log: GameLogEntry[] }) => setLog(l ?? []));

        socket.on('just_one:roundStart', (payload: {
            guesserId: string; guesserName: string; card?: { words: string[] };
        }) => {
            setRound(r => r + 1);
            setRoundState('WAITING');
            setGuesserId(payload.guesserId);
            setGuesserName(payload.guesserName);
            setCard(payload.card ?? null);
            setMyClue('');
            setMyClue2('');
            setClueSubmitted(false);
            setSubmittedPlayers([]);
            setValidatedClues([]);
            setValidClues([]);
            setMyGuess('');
            setLastResult(null);
            startTimer(30);
        });

        socket.on('just_one:writeClues', ({ wordIndex, cluesPerPlayer: cpp }: { wordIndex: number; cluesPerPlayer?: number }) => {
            setCurrentWordIndex(wordIndex);
            setCluesPerPlayer(cpp ?? 1);
            setRoundState('WRITE_CLUES');
            startTimer(60);
        });

        socket.on('just_one:clueSubmitted', ({ playerId, playerDone }: { playerId: string; playerDone?: boolean }) => {
            if (playerDone) setSubmittedPlayers(prev => prev.includes(playerId) ? prev : [...prev, playerId]);
        });

        socket.on('just_one:cluesValidated', ({ allClues }: { allClues: Clue[] }) => {
            setRoundState('VALIDATE_CLUES');
            setValidatedClues(allClues);
            stopTimer();
        });

        socket.on('just_one:guessStart', ({ validClues: vc }: { validClues: string[] }) => {
            setRoundState('GUESS_PHASE');
            setValidClues(vc);
            startTimer(60);
        });

        socket.on('just_one:roundResult', (result: RoundResult) => {
            setRoundState('RESOLUTION');
            setLastResult(result);
            setScore(result.score);
            setHistory(prev => [...prev, { ...result, round: prev.length + 1 }]);
            stopTimer();
        });

        socket.on('just_one:finished', (payload: { score: number; level: string }) => {
            setRoundState('END_GAME');
            setFinalScore(payload);
            stopTimer();
        });

        socket.on('just_one:inactivityWarning', ({ userId: uid, secondsLeft }: { userId: string; username: string; secondsLeft: number }) => {
            setInactivityUserId(uid);
            setInactivityEndsAt(Date.now() + secondsLeft * 1000);
        });

        socket.on('just_one:playerKicked', ({ userId: uid, username }: { userId: string; username?: string }) => {
            const name = username ?? playersRef.current.find(p => p.id === uid)?.name ?? uid;
            playersRef.current = playersRef.current.filter(p => p.id !== uid);
            setKickedPlayers(kp => kp.some(p => p.id === uid) ? kp : [...kp, { id: uid, name }]);
            setPlayers(prev => prev.filter(p => p.id !== uid));
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });

        socket.on('just_one:playerReconnected', ({ userId: uid }: { userId: string }) => {
            setInactivityUserId(prev => prev === uid ? null : prev);
            setInactivityEndsAt(null);
        });

        return () => {
            socket.off('notFound', onNotFound);
            socket.off('just_one:players');
            socket.off('just_one:log');
            socket.off('just_one:roundStart');
            socket.off('just_one:writeClues');
            socket.off('just_one:clueSubmitted');
            socket.off('just_one:cluesValidated');
            socket.off('just_one:guessStart');
            socket.off('just_one:roundResult');
            socket.off('just_one:finished');
            socket.off('just_one:inactivityWarning');
            socket.off('just_one:playerKicked');
            socket.off('just_one:playerReconnected');
            joinedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, lobbyId, userId]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const pickWord = useCallback((wordIndex: number) => {
        socket?.emit('just_one:pickWord', { lobbyId, wordIndex });
    }, [socket, lobbyId]);

    const submitClue = useCallback(() => {
        if (!myClue.trim()) return;
        if (cluesPerPlayer >= 2 && !myClue2.trim()) return;
        socket?.emit('just_one:submitClue', { lobbyId, clue: myClue.trim() });
        if (cluesPerPlayer >= 2) socket?.emit('just_one:submitClue', { lobbyId, clue: myClue2.trim() });
        setClueSubmitted(true);
    }, [socket, lobbyId, myClue, myClue2, cluesPerPlayer]);

    const submitGuess = useCallback((guess: string | null) => {
        socket?.emit('just_one:submitGuess', { lobbyId, guess });
    }, [socket, lobbyId]);

    const surrender = useCallback(() => {
        socket?.emit('just_one:surrender');
    }, [socket]);

    return {
        players,
        guesserId,
        guesserName,
        roundState,
        card,
        score,
        round,
        timerEndsAt,
        timerDuration,
        submittedPlayers,
        cluesPerPlayer,
        myClue,
        setMyClue,
        myClue2,
        setMyClue2,
        clueSubmitted,
        validatedClues,
        validClues,
        myGuess,
        setMyGuess,
        lastResult,
        history,
        finalScore,
        currentWordIndex,
        inactivityUserId,
        inactivityEndsAt,
        kickedPlayers,
        isGuesser,
        log,
        pickWord,
        submitClue,
        submitGuess,
        surrender,
    };
}
