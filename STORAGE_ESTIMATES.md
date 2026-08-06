# S3 Storage Estimates

## File Size Calculations

Based on your current encoding settings:

### Per Episode (1 hour recording)

**Medium Quality (default):**
- Video: 2 Mbps bitrate
  - 1 hour = 2 Mbps × 3600 seconds = 7,200 Mbits = **900 MB**
- Audio: 192 kbps bitrate
  - 1 hour = 192 kbps × 3600 seconds = 691.2 Mbits = **86.4 MB**
- **Total per episode: ~986 MB (~1 GB)**

**Low Quality:**
- Video: 1 Mbps = **450 MB**
- Audio: 192 kbps = **86.4 MB**
- **Total: ~536 MB (~0.5 GB)**

**High Quality:**
- Video: 4 Mbps = **1.8 GB**
- Audio: 192 kbps = **86.4 MB**
- **Total: ~1.9 GB**

### Storage Examples

| Episodes | Medium Quality | Low Quality | High Quality |
|----------|----------------|-------------|--------------|
| 10 episodes | ~10 GB | ~5.4 GB | ~19 GB |
| 50 episodes | ~50 GB | ~27 GB | ~95 GB |
| 100 episodes | ~100 GB | ~54 GB | ~190 GB |
| 500 episodes | ~500 GB | ~270 GB | ~950 GB |

## S3 Pricing Estimates (2024)

### AWS S3 Standard Storage
- **$0.023 per GB/month** (US East region)
- First 50 TB/month

### Monthly Cost Examples

| Storage Used | Monthly Cost (Standard) | Annual Cost |
|-------------|-------------------------|-------------|
| 10 GB | $0.23 | $2.76 |
| 50 GB | $1.15 | $13.80 |
| 100 GB | $2.30 | $27.60 |
| 500 GB | $11.50 | $138.00 |
| 1 TB | $23.00 | $276.00 |

### S3 Intelligent-Tiering (Recommended)
- **$0.023 per GB/month** (frequent access)
- **$0.0125 per GB/month** (infrequent access, after 30 days)
- Automatically moves files between tiers
- **Best for: Episodes that are downloaded once and then rarely accessed**

### S3 Standard-IA (Infrequent Access)
- **$0.0125 per GB/month**
- **$0.01 per GB retrieval fee**
- **Best for: Episodes older than 30 days that are rarely accessed**

### S3 Glacier Instant Retrieval
- **$0.004 per GB/month** (cheapest)
- **$0.03 per GB retrieval fee**
- **Best for: Long-term archival (episodes older than 90 days)**

## Recommended Strategy

### Tiered Storage Approach

1. **First 7 days (retention period):**
   - S3 Standard: $0.023/GB/month
   - Episodes are actively downloaded

2. **After 7 days (if not deleted):**
   - Move to S3 Intelligent-Tiering
   - Automatically transitions to infrequent access after 30 days
   - Saves ~45% on storage costs

3. **After 90 days (long-term archive):**
   - Move to S3 Glacier Instant Retrieval
   - Saves ~83% on storage costs
   - Still allows instant retrieval

### Cost Optimization Tips

1. **Use retention period:** Delete episodes after 7 days (default) to minimize storage
2. **Compress old episodes:** Re-encode old episodes to lower quality before archiving
3. **Lifecycle policies:** Automatically move files to cheaper storage tiers
4. **Monitor usage:** Track which episodes are actually downloaded

## Example Monthly Costs

**Scenario: 50 episodes/month, 7-day retention, Medium quality**

- Active episodes (7 days): ~50 GB
  - S3 Standard: $0.023 × 50 = **$1.15/month**
- If keeping all episodes for 1 year:
  - Average storage: ~600 GB (50 episodes × 12 months)
  - S3 Standard: $0.023 × 600 = **$13.80/month**
  - S3 Intelligent-Tiering: ~**$8-10/month** (estimated)
  - S3 Glacier: ~**$2.40/month** (but retrieval fees apply)

## Data Transfer Costs

**Outbound (downloads):**
- First 100 GB/month: **Free**
- Next 9.9 TB: **$0.09 per GB**
- **Example:** 10 GB downloads/month = **Free**

**Inbound (uploads):**
- **Free** (no charge for uploading to S3)

## Total Cost Estimate

For a typical podcast app with:
- 50 episodes/month
- 7-day retention period
- Medium quality encoding
- ~10 GB downloads/month

**Monthly costs:**
- Storage: ~$1.15 (S3 Standard)
- Data transfer: $0 (under free tier)
- Requests: ~$0.01 (negligible)
- **Total: ~$1.16/month**

**Annual cost: ~$14**

## Comparison: VPS vs S3

| Storage | 50 GB | 100 GB | 500 GB |
|---------|-------|--------|--------|
| VPS (additional disk) | $5-10/month | $10-20/month | $50-100/month |
| S3 Standard | $1.15/month | $2.30/month | $11.50/month |
| **Savings** | **~80%** | **~88%** | **~88%** |

## Notes

- Prices are estimates for US East region (varies by region)
- Actual costs depend on:
  - Number of episodes
  - Episode length
  - Quality settings
  - Retention period
  - Download frequency
  - Storage class used
- Use AWS Pricing Calculator for exact costs: https://calculator.aws/
