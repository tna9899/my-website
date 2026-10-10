import urllib.request
import urllib.error
import base64
import json
import os
import re
import time
import sys
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMORIES_FILE = os.path.join(ROOT_DIR, 'memories.json')
IK_CONFIG_FILE = os.path.join(ROOT_DIR, 'imagekit-config.js')

CLOUD_JSON_URL = 'https://ik.imagekit.io/anhuyen/anhuyen_sync/memories_cloud.json'
FIREBASE_DB_URL = 'https://anhuyen-e8d70-default-rtdb.asia-southeast1.firebasedatabase.app/.json'

def get_private_key():
    if os.environ.get('IMAGEKIT_PRIVATE_KEY'):
        return os.environ['IMAGEKIT_PRIVATE_KEY']
    if os.path.exists(IK_CONFIG_FILE):
        try:
            with open(IK_CONFIG_FILE, 'r', encoding='utf-8') as f:
                content = f.read()
                m = re.search(r'privateKey:\s*["\']([^"\']+)["\']', content)
                if m and 'YOUR_' not in m.group(1):
                    return m.group(1)
        except Exception:
            pass
    return ''

def fetch_json(url, timeout=8):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"[Cleanup] Khong the tai tu {url}: {e}")
        return None

def extract_filename(url_or_path):
    if not url_or_path or not isinstance(url_or_path, str):
        return ''
    clean = url_or_path.split('?')[0].split('#')[0]
    name = clean.split('/')[-1]
    return name if len(name) > 3 else ''

def run_cleanup():
    private_key = get_private_key()
    if not private_key:
        print("❌ Chưa cấu hình ImageKit Private Key!")
        return

    auth_header = 'Basic ' + base64.b64encode((private_key + ':').encode()).decode()

    print("🔄 Đang thu thập danh sách kỷ niệm từ TẤT CẢ các nguồn...")

    deleted_ids = set()
    explicit_delete_files = set()
    active_items = [] # list of dict: {name, memory_id}
    sources_succeeded = 0

    # 1. memories.json local
    if os.path.exists(MEMORIES_FILE):
        try:
            with open(MEMORIES_FILE, 'r', encoding='utf-8') as f:
                local_mems = json.load(f)
                if isinstance(local_mems, list):
                    sources_succeeded += 1
                    for m in local_mems:
                        if not m or not isinstance(m, dict) or not m.get('id'):
                            continue
                        imgs = m.get('images') or ([m.get('image')] if m.get('image') else [])
                        for img in imgs:
                            name = extract_filename(img)
                            if name:
                                active_items.append({'name': name, 'memory_id': str(m['id'])})
        except Exception as e:
            print("[Cleanup] Lỗi đọc memories.json:", e)

    # 2. ImageKit Cloud
    cloud_data = fetch_json(f'{CLOUD_JSON_URL}?_t={int(time.time()*1000)}')
    if cloud_data:
        sources_succeeded += 1
        if isinstance(cloud_data, dict):
            for did in cloud_data.get('deletedIds', []):
                deleted_ids.add(str(did))
            for dimg in cloud_data.get('deletedImages', []):
                fn = extract_filename(dimg)
                if fn:
                    explicit_delete_files.add(fn)
            cloud_mems = cloud_data.get('memories', [])
        elif isinstance(cloud_data, list):
            cloud_mems = cloud_data
        else:
            cloud_mems = []

        if isinstance(cloud_mems, list):
            for m in cloud_mems:
                if not m or not isinstance(m, dict) or not m.get('id'):
                    continue
                imgs = m.get('images') or ([m.get('image')] if m.get('image') else [])
                for img in imgs:
                    name = extract_filename(img)
                    if name:
                        active_items.append({'name': name, 'memory_id': str(m['id'])})

    # 3. Firebase RTDB
    fb_data = fetch_json(FIREBASE_DB_URL)
    if fb_data and isinstance(fb_data, dict):
        sources_succeeded += 1
        for did in fb_data.get('deletedIds', []):
            deleted_ids.add(str(did))
        for dimg in fb_data.get('deletedImages', []):
            fn = extract_filename(dimg)
            if fn:
                explicit_delete_files.add(fn)
        fb_mems = fb_data.get('memories', [])
        if isinstance(fb_mems, list):
            for m in fb_mems:
                if not m or not isinstance(m, dict) or not m.get('id'):
                    continue
                imgs = m.get('images') or ([m.get('image')] if m.get('image') else [])
                for img in imgs:
                    name = extract_filename(img)
                    if name:
                        active_items.append({'name': name, 'memory_id': str(m['id'])})

    # Loc lai file thuc su hoat dong
    truly_active_filenames = set()
    for item in active_items:
        if item['memory_id'] not in deleted_ids and item['name'] not in explicit_delete_files:
            truly_active_filenames.add(item['name'])

    print("📊 Kết quả tổng hợp:")
    print(f"   - Số nguồn đọc thành công: {sources_succeeded}")
    print(f"   - Số kỷ niệm đã xóa (deletedIds): {len(deleted_ids)}")
    print(f"   - Số ảnh kỷ niệm đang thực sự hoạt động: {len(truly_active_filenames)}")

    if sources_succeeded == 0:
        print("❌ KHÓA AN TOÀN: Không kết nối được nguồn nào. Dừng cleanup!")
        return

    # 4. Lay danh sach file trong /anhuyen_memories tren ImageKit
    all_files = []
    skip = 0
    limit = 100
    while True:
        url = f'https://api.imagekit.io/v1/files?path=/anhuyen_memories&limit={limit}&skip={skip}'
        req = urllib.request.Request(url, headers={'Authorization': auth_header})
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                if not data or not isinstance(data, list):
                    break
                all_files.extend(data)
                if len(data) < limit:
                    break
                skip += limit
        except Exception as e:
            print("❌ Lỗi lấy danh sách file ImageKit:", e)
            return

    print(f"📁 Tổng số ảnh trên ImageKit (/anhuyen_memories): {len(all_files)}")

    # 5. Xac dinh anh mo coi
    now = time.time()
    GRACE_PERIOD_SEC = 6 * 3600 # 6 tieng

    orphaned = []
    for f in all_files:
        name = f.get('name')
        if not name:
            continue
        if name in truly_active_filenames:
            continue
        if name in explicit_delete_files:
            orphaned.append(f)
            continue

        created_str = f.get('createdAt')
        is_recent = False
        if created_str:
            try:
                # Parse ISO timestamp
                clean_ts = created_str.replace('Z', '+00:00')
                created_dt = datetime.fromisoformat(clean_ts)
                if (now - created_dt.timestamp()) < GRACE_PERIOD_SEC:
                    is_recent = True
            except Exception:
                pass

        if is_recent:
            print(f"🛡️ Giữ lại file mới tải lên (< 6h): {name}")
            continue

        orphaned.append(f)

    print(f"🗑️ Số ảnh thừa/mồ côi cần xóa: {len(orphaned)}")
    if not orphaned:
        print("✅ ImageKit đã sạch hoàn toàn! Không có ảnh thừa.")
        return

    # 6. Xoa file mo coi
    deleted_count = 0
    for f in orphaned:
        file_id = f.get('fileId')
        name = f.get('name')
        if not file_id:
            continue
        del_url = f'https://api.imagekit.io/v1/files/{file_id}'
        del_req = urllib.request.Request(del_url, method='DELETE', headers={'Authorization': auth_header})
        try:
            with urllib.request.urlopen(del_req) as resp:
                print(f"🗑️ Đã xóa: {name} (ID: {file_id})")
                deleted_count += 1
        except Exception as e:
            print(f"⚠️ Lỗi xóa file {name}: {e}")

    print(f"🎉 Hoàn tất dọn dẹp ImageKit! Đã xóa {deleted_count}/{len(orphaned)} file.")

if __name__ == '__main__':
    run_cleanup()
