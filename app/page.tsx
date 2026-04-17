'use client';

import React, { useEffect, useMemo, useState } from 'react';

type ScoreCell = number | '';
type Transfer = {
  from: number;
  to: number;
  amount: number;
};

type HoleResult = {
  hole: number;
  nets: number[];
  transfers: Transfer[];
  filled: boolean;
};

type GameResult = {
  holeResults: HoleResult[];
  playerTotals: number[];
  settledTransfers: Transfer[];
  receiveTotals: number[];
  payTotals: number[];
};

const HOLES = 18;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const DEFAULT_PLAYER_COUNT = 4;
const DEFAULT_RULE_LABEL = 'สโตรกมากจ่ายทุกคนที่สโตรกน้อยกว่า';
const APP_VERSION = 'v1.2.0';
const STORAGE_KEY = 'golf-betting-app-state-v1.2.0';

const styles: Record<string, React.CSSProperties> = {
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    alignItems: 'center',
  },
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 'clamp(12px, 2vw, 24px)',
    fontFamily: 'Arial, sans-serif',
    color: '#0f172a',
  },
  container: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'grid',
    gap: '20px',
  },
  gridTop: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  gridBottom: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '18px',
    padding: 'clamp(14px, 2vw, 20px)',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
    minWidth: 0,
  },
  title: {
    fontSize: 'clamp(22px, 4vw, 28px)',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 'clamp(18px, 3vw, 20px)',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.25,
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
    display: 'block',
  },
  input: {
    width: '100%',
    minWidth: 0,
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '16px',
    boxSizing: 'border-box',
    background: '#fff',
  },
  button: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    flex: '1 1 180px',
    maxWidth: '100%',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  badge: {
    background: '#e2e8f0',
    color: '#334155',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  playersRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '12px',
  },
  controlsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
  },
  scoreTableWrap: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 'max-content',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    background: '#f8fafc',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    fontSize: '14px',
  },
  summaryBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '12px 14px',
    gap: '10px',
    flexWrap: 'wrap',
  },
  holeCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    marginBottom: '12px',
  },
  holeNetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '8px',
    marginTop: '10px',
  },
  holeNetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '10px 12px',
    gap: '10px',
    flexWrap: 'wrap',
  },
  transferItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  smallText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
};

const makePlayers = (count: number): string[] =>
  Array.from({ length: count }, (_, idx) => String.fromCharCode(65 + idx));

const makeScores = (count: number): ScoreCell[][] =>
  Array.from({ length: HOLES }, () => Array.from({ length: count }, () => ''));

function formatMoney(value: number | string): string {
  const n = Number(value || 0);
  return n.toLocaleString('th-TH');
}

function computeGame(scores: ScoreCell[][], rate: number): GameResult {
  const playerCount = scores[0]?.length ?? 0;
  const holeResults: HoleResult[] = [];
  const playerTotals = Array.from({ length: playerCount }, () => 0);
  const transferMap = new Map<string, number>();

  const addTransfer = (from: number, to: number, amount: number) => {
    const key = `${from}->${to}`;
    transferMap.set(key, (transferMap.get(key) || 0) + amount);
  };

  for (let h = 0; h < HOLES; h += 1) {
    const holeScores = (scores[h] || []).map((v) => (v === '' ? '' : Number(v)));
    const allFilled =
      holeScores.length === playerCount && holeScores.every((v) => v !== '' && !Number.isNaN(v));

    if (!allFilled) {
      holeResults.push({
        hole: h + 1,
        nets: Array.from({ length: playerCount }, () => 0),
        transfers: [],
        filled: false,
      });
      continue;
    }

    const numericScores = holeScores as number[];
    const nets = Array.from({ length: playerCount }, () => 0);
    const transfers: Transfer[] = [];

    for (let i = 0; i < playerCount; i += 1) {
      for (let j = 0; j < playerCount; j += 1) {
        if (i === j) continue;

        const myScore = numericScores[i];
        const otherScore = numericScores[j];

        if (myScore > otherScore) {
          nets[i] -= rate;
          nets[j] += rate;
          transfers.push({ from: i, to: j, amount: rate });
          addTransfer(i, j, rate);
        }
      }
    }

    nets.forEach((v, idx) => {
      playerTotals[idx] += v;
    });

    holeResults.push({
      hole: h + 1,
      nets,
      transfers,
      filled: true,
    });
  }

  const settledTransfers: Transfer[] = Array.from(transferMap.entries())
    .map(([key, amount]) => {
      const [from, to] = key.split('->').map(Number);
      return { from, to, amount };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const receiveTotals = Array.from({ length: playerCount }, () => 0);
  const payTotals = Array.from({ length: playerCount }, () => 0);
  settledTransfers.forEach((t) => {
    payTotals[t.from] += t.amount;
    receiveTotals[t.to] += t.amount;
  });

  return {
    holeResults,
    playerTotals,
    settledTransfers,
    receiveTotals,
    payTotals,
  };
}

type AppState = {
  playerCount: number;
  players: string[];
  rate: number;
  scores: ScoreCell[][];
};

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeImportedState(parsed: Partial<AppState>): AppState {
  const nextPlayerCount = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, Number(parsed.playerCount) || DEFAULT_PLAYER_COUNT)
  );

  return {
    playerCount: nextPlayerCount,
    players: Array.from({ length: nextPlayerCount }, (_, idx) => parsed.players?.[idx] || `P${idx + 1}`),
    rate: Number(parsed.rate) || 20,
    scores: Array.from({ length: HOLES }, (_, holeIdx) =>
      Array.from({ length: nextPlayerCount }, (_, playerIdx) => parsed.scores?.[holeIdx]?.[playerIdx] ?? '')
    ),
  };
}

function netColor(value: number): string {
  return value >= 0 ? '#059669' : '#dc2626';
}

export default function GolfBettingWebApp() {
  const [playerCount, setPlayerCount] = useState<number>(DEFAULT_PLAYER_COUNT);
  const [players, setPlayers] = useState<string[]>(makePlayers(DEFAULT_PLAYER_COUNT));
  const [rate, setRate] = useState<number>(20);
  const [scores, setScores] = useState<ScoreCell[][]>(makeScores(DEFAULT_PLAYER_COUNT));
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppState>;
        const nextState = sanitizeImportedState(parsed);
        setPlayerCount(nextState.playerCount);
        setPlayers(nextState.players);
        setRate(nextState.rate);
        setScores(nextState.scores);
      }
    } catch (error) {
      console.error('Failed to load saved state', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const appState: AppState = {
      playerCount,
      players,
      rate,
      scores,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
      console.error('Failed to save state', error);
    }
  }, [isLoaded, playerCount, players, rate, scores]);

  const result = useMemo(() => computeGame(scores, Number(rate || 0)), [scores, rate]);

  const updatePlayer = (index: number, value: string) => {
    const next = [...players];
    next[index] = value || `P${index + 1}`;
    setPlayers(next);
  };

  const updatePlayerCount = (nextCountRaw: string) => {
    const nextCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number(nextCountRaw) || DEFAULT_PLAYER_COUNT));
    setPlayerCount(nextCount);

    const nextPlayers = Array.from({ length: nextCount }, (_, idx) => players[idx] || `P${idx + 1}`);
    setPlayers(nextPlayers);

    const nextScores = Array.from({ length: HOLES }, (_, holeIdx) =>
      Array.from({ length: nextCount }, (_, playerIdx) => scores[holeIdx]?.[playerIdx] ?? '')
    );
    setScores(nextScores);
  };

  const updateScore = (holeIndex: number, playerIndex: number, value: string) => {
    const next = scores.map((row) => [...row]);
    next[holeIndex][playerIndex] = value === '' ? '' : Math.max(0, Number(value));
    setScores(next);
  };

  const resetAll = () => {
    setPlayerCount(DEFAULT_PLAYER_COUNT);
    setPlayers(makePlayers(DEFAULT_PLAYER_COUNT));
    setRate(20);
    setScores(makeScores(DEFAULT_PLAYER_COUNT));
    setMessage('รีเซ็ตทั้งหมดแล้ว');
  };

  const startNewRound = () => {
    setScores(makeScores(playerCount));
    setMessage('เริ่มรอบใหม่แล้ว โดยคงชื่อผู้เล่นและเรทเดิมไว้');
  };

  const clearSavedData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setMessage('ล้างข้อมูลที่บันทึกไว้บนเครื่องนี้แล้ว');
  };

  const exportJson = () => {
    const payload: AppState = { playerCount, players, rate, scores };
    downloadTextFile(
      `golf-betting-${APP_VERSION}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    setMessage('Export JSON เรียบร้อยแล้ว');
  };

  const importJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<AppState>;
      const nextState = sanitizeImportedState(parsed);
      setPlayerCount(nextState.playerCount);
      setPlayers(nextState.players);
      setRate(nextState.rate);
      setScores(nextState.scores);
      setMessage('Import JSON เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Failed to import state', error);
      setMessage('Import JSON ไม่สำเร็จ');
    }

    event.target.value = '';
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.gridTop}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 style={styles.title}>Golf Betting App</h1>
              <span style={styles.badge}>{APP_VERSION}</span>
            </div>
            <p style={styles.smallText}>เวอร์ชัน deploy ง่าย พร้อมคำนวณแบบสโตรกมากจ่ายให้ทุกคนที่สโตรกน้อยกว่า จำค่าล่าสุดอัตโนมัติ และรองรับ export/import</p>
            <div style={{ height: 16 }} />
            <div style={styles.controlsRow}>
              <div>
                <label style={styles.label}>จำนวนผู้เล่น</label>
                <input
                  style={styles.input}
                  type="number"
                  min={MIN_PLAYERS}
                  max={MAX_PLAYERS}
                  value={playerCount}
                  onChange={(e) => updatePlayerCount(e.target.value)}
                />
              </div>
              <div>
                <label style={styles.label}>เรท/คน/หลุม</label>
                <input
                  style={styles.input}
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div style={{ height: 12 }} />
            <div style={styles.playersRow}>
              {players.map((name, idx) => (
                <div key={idx}>
                  <label style={styles.label}>ผู้เล่น {idx + 1}</label>
                  <input
                    style={styles.input}
                    value={name}
                    onChange={(e) => updatePlayer(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div style={{ height: 16 }} />
            <div style={styles.badgeRow}>
              <span style={styles.badge}>{playerCount} คน</span>
              <span style={styles.badge}>{DEFAULT_RULE_LABEL}</span>
              <span style={styles.badge}>เรท/คน/หลุม</span>
              <span style={styles.badge}>สโตรกเท่ากัน = ไม่ต้องจ่ายกัน</span>
              <span style={styles.badge}>{APP_VERSION}</span>
            </div>
            <div style={{ height: 14 }} />
            <div style={{ ...styles.actionRow, alignItems: 'stretch' }}>
              <button style={styles.button} onClick={startNewRound}>เริ่มรอบใหม่</button>
              <button style={styles.button} onClick={resetAll}>รีเซ็ตทั้งหมด</button>
              <button style={styles.button} onClick={clearSavedData}>ล้างข้อมูลที่บันทึก</button>
              <button style={styles.button} onClick={exportJson}>Export JSON</button>
              <label style={{ ...styles.button, display: 'inline-flex', alignItems: 'center' }}>
                Import JSON
                <input type="file" accept="application/json" onChange={importJson} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ height: 10 }} />
            <div style={styles.smallText}>{message || 'ข้อมูลจะถูกบันทึกอัตโนมัติบนเครื่องนี้'}</div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.subtitle}>สรุปสุทธิ</h2>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gap: 10 }}>
              {players.map((name, idx) => {
                const net = result.playerTotals[idx] ?? 0;
                return (
                  <div key={idx} style={styles.summaryBox}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{name}</div>
                      <div style={styles.smallText}>
                        รับ {formatMoney(result.receiveTotals[idx] ?? 0)} / จ่าย {formatMoney(result.payTotals[idx] ?? 0)}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: netColor(net) }}>
                      {net >= 0 ? '+' : ''}{formatMoney(net)}
                    </div>
                  </div>
                );
              })}
              <div style={styles.smallText}>บันทึกข้อมูลล่าสุดอัตโนมัติบนเครื่องนี้</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.subtitle}>กรอกสโตรครายหลุม</h2>
          <div style={{ height: 12 }} />
          <div style={styles.scoreTableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>หลุม</th>
                  {players.map((name, idx) => (
                    <th style={styles.th} key={idx}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map((row, holeIdx) => (
                  <tr key={holeIdx}>
                    <td style={styles.td}>{holeIdx + 1}</td>
                    {row.map((value, playerIdx) => (
                      <td style={styles.td} key={playerIdx}>
                        <input
                          style={{ ...styles.input, width: '100%', minWidth: 72 }}
                          type="number"
                          min="1"
                          value={value}
                          onChange={(e) => updateScore(holeIdx, playerIdx, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.gridBottom}>
          <div style={styles.card}>
            <h2 style={styles.subtitle}>สรุปรายหลุม</h2>
            <div style={{ height: 12 }} />
            <div style={{ maxHeight: 560, overflow: 'auto' }}>
              {result.holeResults.map((hole) => (
                <div key={hole.hole} style={styles.holeCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>หลุม {hole.hole}</div>
                    <span style={styles.badge}>{hole.filled ? 'คำนวณแล้ว' : 'ยังกรอกไม่ครบ'}</span>
                  </div>
                  {hole.filled ? (
                    <>
                      <div style={styles.holeNetGrid}>
                        {players.map((name, idx) => {
                          const net = hole.nets[idx] ?? 0;
                          return (
                            <div key={idx} style={styles.holeNetItem}>
                              <span>{name}</span>
                              <span style={{ fontWeight: 700, color: netColor(net) }}>
                                {net >= 0 ? '+' : ''}{formatMoney(net)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
                        {hole.transfers.length === 0 ? (
                          <div style={styles.smallText}>ไม่มีรายการจ่ายในหลุมนี้</div>
                        ) : (
                          hole.transfers.map((t, idx) => (
                            <div key={idx} style={styles.smallText}>
                              {players[t.from]} → {players[t.to]} = {formatMoney(t.amount)} บาท
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ ...styles.smallText, marginTop: 10 }}>รอกรอกคะแนนให้ครบทุกคน</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.subtitle}>สรุปโอนเงินจริง</h2>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gap: 10 }}>
              {result.settledTransfers.length === 0 ? (
                <div style={{ ...styles.holeCard, textAlign: 'center', color: '#64748b' }}>ยังไม่มีรายการโอน</div>
              ) : (
                result.settledTransfers.map((t, idx) => (
                  <div key={idx} style={styles.transferItem}>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {players[t.from]} → {players[t.to]}
                      </div>
                      <div style={styles.smallText}>ยอดสุทธิหลังรวมทุกหลุม</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{formatMoney(t.amount)} บาท</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
