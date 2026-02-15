# Log Generator Testing Checklist

## CLI Script
- [ ] `npm run generate-logs` shows interactive menu
- [ ] Selecting scenario generates logs
- [ ] Files created in `logs/generated/`
- [ ] Logs are properly formatted
- [ ] Metadata JSON created
- [ ] `--quick` flag works
- [x] `--scenario` flag works
- [x] `--count` flag validates (1-1000)
- [ ] Error handling for invalid input

## API Endpoints
- [x] GET `/scenarios` returns list
- [x] POST `/generate` creates files
- [ ] POST `/generate` with `autoIngest=true` detects incidents
- [x] POST `/generate-and-analyze` returns incidents
- [x] GET `/generated` lists files
- [ ] DELETE `/generated/:file` removes file
- [x] Rate limiting works (5 req/min)
- [x] Validation rejects invalid `scenarioType`
- [x] Validation rejects `count > 1000`

## Frontend
- [ ] Generator page loads
- [ ] Scenarios display correctly
- [ ] Can select scenario
- [ ] Log count slider works
- [ ] Auto-ingest toggle works
- [ ] Generate button triggers API
- [ ] Loading state shows during generation
- [ ] Success message displays
- [ ] Files list populates
- [ ] Can delete generated files
- [ ] Dashboard widget works
- [ ] Navigation from results to incidents
- [ ] Error handling shows user-friendly messages
- [ ] Responsive on mobile

## Integration
- [ ] Generated logs can be uploaded via Upload page
- [ ] Auto-ingest creates incidents
- [ ] Incidents appear in Incidents list
- [ ] Detection rules trigger correctly
- [ ] AI explanations work on generated incidents
- [ ] Charts update with new data
- [ ] No conflicts with existing features

## Edge Cases
- [ ] Generating 1000+ logs performs well
- [ ] Multiple rapid generations handled
- [ ] Invalid scenario type rejected
- [ ] File system errors handled
- [ ] API timeout handled (long generation)
- [ ] Duplicate filenames handled
- [ ] Permission errors handled

---

## Execution Notes (Automated)

- Date: 2026-02-15
- CLI perf: `node scripts/generateLogs.js --scenario BRUTE_FORCE --count 1000` completed in ~0.5s on this machine; generated files + `scenario-metadata.json` in `backend/logs/generated/`.
- API smoke: `GET /api/generate/scenarios`, `POST /api/generate/logs`, `POST /api/generate/logs/analyze`, `GET /api/generate/generated` succeeded.
- API validation: invalid `scenarioType` and `count > 1000` returned HTTP 400.
- API rate limit: rapid calls returned `[200, 200, 200, 429, 429, 429]`.

## Performance Testing (Step 9F.3)

### 1) Large log generation
Command:

```bash
node scripts/generateLogs.js --scenario BRUTE_FORCE --count 1000
```

Expected:
- Completes in < 10 seconds
- File size reasonable

### 2) API stress test
- Generate 5 times rapidly
- Verify rate limiting kicks in
- No crashes

### 3) Frontend responsiveness
- Generate logs via UI
- Check for UI freezing
- Loading indicators work

### If performance issues
Copilot prompt:

```
Optimize log generation:
- Batch file writes
- Use streams for large files
- Add progress callbacks
- Implement async generation queue
✅ Checkpoint: All tests pass, performance acceptable.
```
