import urllib.request
import base64
import json
import os
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMORIES_FILE = os.path.join(ROOT_DIR, 'memories.json')
IK_CONFIG_FILE = os.path.join(ROOT_DIR, 'imagekit-config.js')

def get_private_key():
    if os.environ.get('IMAGEKIT_PRIVATE_KEY'):
        return os.environ['IMAGEKIT_PRIVATE_KEY']
    if os.path.exists(IK_CONFIG_FILE):
        with open(IK_CONFIG_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            m = re.search(r'privateKey:\s*["\']([^"\']+)["\']', content)
            if m and 'YOUR_' not in m.group(1):
                return m.group(1)
    return ''

def run_cleanup():
    private_key = get_private_key()
    if not private_key:
        print("[ImageKit Cleanup] Chua cau hinh ImageKit Private Key!")
        return

    auth_header = 'Basic ' + base64.b64encode((private_key + ':').encode()).decode()

    # 1. Doc danh sach anh trong memories.json
    active_files = set()
    if os.path.exists(MEMORIES_FILE):
        try:
            with open(MEMORIES_FILE, 'r', encoding='utf-8') as f:
                memories = json.load(f)
                if isinstance(memories, list):
                    for m in memories:
                        imgs = m.get('images', []) if isinstance(m, dict) else []
                        if isinstance(imgs, list):
                            for img in imgs:
                                if isinstance(img, str) and 'ik.imagekit.io' in img:
                                    name = img.split('/')[-1].split('?')[0]
                                    if name:
                                        active_files.add(name)
        except Exception as e:
            print("[ImageKit Cleanup] Loi doc memories.json:", e)

    print(f"[ImageKit Cleanup] So anh dang dung: {len(active_files)}")

    # 2. Lay danh sach file trong /anhuyen_memories
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
            print("[ImageKit Cleanup] Loi lay danh sach file:", e)
            break

    print(f"[ImageKit Cleanup] Tong so file tren ImageKit (/anhuyen_memories): {len(all_files)}")

    # 3. Loc file mo coi can xoa
    orphaned = [f for f in all_files if f.get('name') and f.get('name') not in active_files]
    print(f"[ImageKit Cleanup] So file can xoa: {len(orphaned)}")

    for f in orphaned:
        file_id = f.get('fileId')
        name = f.get('name')
        if not file_id:
            continue
        del_url = f'https://api.imagekit.io/v1/files/{file_id}'
        del_req = urllib.request.Request(del_url, method='DELETE', headers={'Authorization': auth_header})
        try:
            with urllib.request.urlopen(del_req) as resp:
                print(f"[ImageKit Cleanup] Da xoa: {name} (ID: {file_id})")
        except Exception as e:
            print(f"[ImageKit Cleanup] Loi xoa {name}:", e)

    print("[ImageKit Cleanup] Hoan tat!")

if __name__ == '__main__':
    run_cleanup()
