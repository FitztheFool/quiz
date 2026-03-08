{myTeam !== null && (
    <div className="space-y-5 text-left">
        <div>
            <p className="text-xs text-white/40 mb-2">🤝 Pièges de l'équipe</p>
            <div className="space-y-2">
                {Array.from({ length: game.trapWordCount }).map((_, i) => {
                    // Valeur fusionnée : première valeur non vide parmi tous les coéquipiers
                    const allTeamPlayers = game.players.filter(p => p.team === myTeam);
                    const mergedValue = (() => {
                        for (const p of allTeamPlayers) {
                            const val = game.trapsByPlayer?.[p.userId]?.[i];
                            if (val && val.trim()) return val;
                        }
                        return '';
                    })();

                    return (
                        <input
                            key={i}
                            value={mergedValue}
                            onChange={e => {
                                const next = Array.from({ length: game.trapWordCount }, (_, idx) => {
                                    const allPlayers = game.players.filter(p => p.team === myTeam);
                                    for (const p of allPlayers) {
                                        const val = game.trapsByPlayer?.[p.userId]?.[idx];
                                        if (val && val.trim()) return val;
                                    }
                                    return '';
                                });
                                next[i] = e.target.value;
                                socket?.emit('taboo:submitTraps', { lobbyId, traps: next });
                            }}
                            placeholder={`Mot piégé ${i + 1}`}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 placeholder:text-white/20"
                        />
                    );
                })}
            </div>
        </div>
    </div>
)}
