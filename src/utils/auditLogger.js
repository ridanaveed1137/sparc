const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

const GENESIS_HASH = '0'.repeat(64);

function computeHash({ eventType, actorId, ipAddress, details, severity, prevHash, timestamp }) {
  const payload = JSON.stringify({ eventType, actorId, ipAddress, details, severity, prevHash, timestamp });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function logEvent({ eventType, actorId = null, ipAddress = null, details = null, severity = 'info' }) {
  const lastEntry = await AuditLog.findOne({ order: [['id', 'DESC']] });
  const prevHash = lastEntry ? lastEntry.hash : GENESIS_HASH;
  const timestamp = new Date().toISOString();
  const detailsStr = typeof details === 'string' || details === null ? details : JSON.stringify(details);

  const hash = computeHash({ eventType, actorId, ipAddress, details: detailsStr, severity, prevHash, timestamp });

  const entry = await AuditLog.create({
    eventType,
    actorId,
    ipAddress,
    details: detailsStr,
    severity,
    prevHash,
    hash,
    timestamp,
  });

  return entry;
}

// Walks the entire chain and verifies no entry has been tampered with.
async function verifyChain() {
  const entries = await AuditLog.findAll({ order: [['id', 'ASC']] });
  let expectedPrevHash = GENESIS_HASH;

  for (const entry of entries) {
    if (entry.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtId: entry.id, reason: 'prevHash mismatch' };
    }
    const recomputed = computeHash({
      eventType: entry.eventType,
      actorId: entry.actorId,
      ipAddress: entry.ipAddress,
      details: entry.details,
      severity: entry.severity,
      prevHash: entry.prevHash,
      timestamp: entry.timestamp,
    });
    if (recomputed !== entry.hash) {
      return { valid: false, brokenAtId: entry.id, reason: 'hash mismatch (data was altered)' };
    }
    expectedPrevHash = entry.hash;
  }

  return { valid: true };
}

module.exports = { logEvent, verifyChain };
