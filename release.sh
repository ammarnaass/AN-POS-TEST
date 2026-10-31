#!/usr/bin/env bash
# منظومة النشر السريع AN POS لنظام Linux و Mac و WSL
# الاستخدام:
#   ./release.sh               (تفاعلي مع قائمة خيارات)
#   ./release.sh patch         (ترقية patch ونشر فوري)
#   ./release.sh minor         (ترقية minor ونشر فوري)
#   ./release.sh major         (ترقية major ونشر فوري)
#   ./release.sh --current     (إعادة نشر الإصدار الحالي)

set -e
cd "$(dirname "$0")"
node scripts/publish-release.mjs "$@"
