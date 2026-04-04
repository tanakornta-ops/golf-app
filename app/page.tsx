'use client';

import React, { useMemo, useState } from 'react';

const PLAYER_COUNT = 4;
const HOLES = 18;

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '24px',
    fontFamily: 'Arial, sans-serif',
    color: '#0f172a',
  },
  container: {
    maxWidth: '1200px',
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
    padding: '20px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
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
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 12px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
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
  scoreTableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '560px',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '14px',
    background: '#f8fafc',
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
  },
  holeCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
    marginBottom: '12px',
  },
  holeNetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '10px',
  },
  holeNetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '10px 12px',
  },
  transferItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '14px',
  },
  smallText: {
    fontSize: '13px',
    color: '#64748b',
  },
};

const makeInitialPlayers = () => ['A', 'B', 'C', 'D'];
const makeInitialScores = () =>
  Array.from({ length: HOLES }, () => Array.from({ length: PLAYER_COUNT }, () => ''));

function formatMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString('th-TH');
}

function computePairwise(scores, rate) {
  const holeResults = [];
  const playerTotals = Array.from({ length: PLAYER_COUNT }, () => 0);
  const transferMap = new Map();

  const addTransfer = (from, to, amount) => {
    const key = `${from}->${to}`;
    transferMap.set(key, (transferMap.get(key) || 0) + amount);
  };

  for (let h = 0; h < HOLES; h += 1) {
    const holeScores = scores[h].map((v) => (v === '' ? '' : Number(v)));
    const allFilled = holeScores.every((v) => v !== '' && !Number.isNaN(v));

    if (!allFilled) {
      holeResults.push({
        hole: h + 1,
        nets: Array.from({ length: PLAYER_COUNT }, () => 0),
        transfers: [],
        filled: false,
      });
      continue;
    }

    const nets = Array.from({ length: PLAYER_COUNT }, () => 0);
    const transfers = [];

    for (let i = 0; i < PLAYER_COUNT; i += 1) {
      for (let j = i + 1; j < PLAYER_COUNT; j += 1) {
        const a = holeScores[i];
        const b = holeScores[j];

        if (a < b) {
          nets[i] += rate;
          nets[j] -= rate;
          transfers.push({ from: j, to: i, amount: rate });
          addTransfer(j, i, rate);
        } else if (a > b) {
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

  const rawTransfers = Array.from(transferMap.entries()).map(([key, amount]) => {
    const [from, to] = key.split('->').map(Number);
    return { from, to, amount };
  });

  const settled = [];
  const used = new Set();

  rawTransfers.forEach((t, idx) => {
    if (used.has(idx) || t.amount <= 0) return;
    const reverseIdx = rawTransfers.findIndex(
      (r, rIdx) => !used.has(rIdx) && r.from === t.to && r.to === t.from
    );
    const reverseAmount = reverseIdx >= 0 ? rawTransfers[reverseIdx].amount : 0;
    const net = t.amount - reverseAmount;

    if (reverseIdx >= 0) used.add(reverseIdx);
    used.add(idx);

    if (net > 0) settled.push({ from: t.from, to: t.to, amount: net });
    if (net < 0) settled.push({ from: t.to, to: t.from, amount: Math.abs(net) });
  });

  const receiveTotals = Array.from({ length: PLAYER_COUNT }, () => 0);
  const payTotals = Array.from({ length: PLAYER_COUNT }, () => 0);
  settled.forEach((t) => {
    payTotals[t.from] += t.amount;
    receiveTotals[t.to] += t.amount;
  });

  return {
    holeResults,
    playerTotals,
    settledTransfers: settled.sort((a, b) => b.amount - a.amount),
    receiveTotals,
    payTotals,
  };
}

function netColor(value) {
  return value >= 0 ? '#059669' : '#dc2626';
}

export default function GolfBettingWebApp() {
  const [players, setPlayers] = useState(makeInitialPlayers);
  const [rate, setRate] = useState(20);
  const [scores, setScores] = useState(makeInitialScores);

  const result = useMemo(() => computePairwise(scores, Number(rate || 0)), [scores, rate]);

  const updatePlayer = (index, value) => {
    const next = [...players];
    next[index] = value || `P${index + 1}`;
    setPlayers(next);
  };

  const updateScore = (holeIndex, playerIndex, value) => {
    const next = scores.map((row) => [...row]);
    next[holeIndex][playerIndex] = value === '' ? '' : Math.max(0, Number(value));
    setScores(next);
  };

  const resetAll = () => {
    setPlayers(makeInitialPlayers());
    setRate(20);
    setScores(makeInitialScores());
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.gridTop}>
          <div style={styles.card}>
            <h1 style={styles.title}>Golf Pairwise Betting App</h1>
            <p style={styles.smallText}>เวอร์ชัน deploy ง่าย ไม่ต้องใช้ shadcn/ui หรือ lucide-react</p>
            <div style={{ height: 16 }} />
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
              <div>
                <label style={styles.label}>เรท/คู่/หลุม</label>
                <input
                  style={styles.input}
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ height: 16 }} />
            <div style={styles.badgeRow}>
              <span style={styles.badge}>4 คน</span>
              <span style={styles.badge}>Pairwise</span>
              <span style={styles.badge}>สโตรคน้อยชนะ</span>
              <span style={styles.badge}>เสมอไม่จ่าย</span>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.subtitle}>สรุปสุทธิ</h2>
            <div style={{ height: 12 }} />
            <div style={{ display: 'grid', gap: 10 }}>
              {players.map((name, idx) => {
                const net = result.playerTotals[idx];
                return (
                  <div key={idx} style={styles.summaryBox}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{name}</div>
                      <div style={styles.smallText}>
                        รับ {formatMoney(result.receiveTotals[idx])} / จ่าย {formatMoney(result.payTotals[idx])}
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: netColor(net) }}>
                      {net >= 0 ? '+' : ''}{formatMoney(net)}
                    </div>
                  </div>
                );
              })}
              <button style={styles.button} onClick={resetAll}>รีเซ็ต</button>
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
                          style={{ ...styles.input, width: 88 }}
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
                          const net = hole.nets[idx];
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
                          <div style={styles.smallText}>เสมอทุกคู่</div>
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
                    <div style={{ ...styles.smallText, marginTop: 10 }}>รอกรอกคะแนนให้ครบ 4 คน</div>
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
                      <div style={styles.smallText}>ยอดสุทธิหลังหักกันแล้ว</div>
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