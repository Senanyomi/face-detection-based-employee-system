import zipfile
from pathlib import Path
path = Path('face_detection_model.keras')
print('path', path)
print('exists', path.exists())
print('is_file', path.is_file())
print('is_zip', zipfile.is_zipfile(path))
with zipfile.ZipFile(path, 'r') as z:
    names = z.namelist()
    print('count', len(names))
    print('names[:50] =', names[:50])
    json_names = [n for n in names if n.lower().endswith('.json')]
    print('json_names', json_names)
    if json_names:
        txt = z.read(json_names[0]).decode('utf-8')
        print('--- first json content start ---')
        print(txt[:1500])
        print('--- first json content end ---')
    if 'config.json' in names:
        config = z.read('config.json').decode('utf-8')
        print('--- config.json start ---')
        print(config[:4000])
        print('--- config.json end ---')
