#!/usr/bin/env python3
"""Q4-2B: 小画面・横向きでレイアウトが崩れないこと（audit_layout の指摘が0件）"""
import subprocess, sys, os, re
out = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'audit_layout.py')], capture_output=True, text=True).stdout
print(out.strip())
m = re.search(r'---\s*(\d+)件中\s*(\d+)件', out)
ok = bool(m) and m.group(2) == '0'
print(('PASS' if ok else 'FAIL') + ' 全画面×全解像度で指摘0件')
print('RESULT: ' + ('OK' if ok else 'NG')); sys.exit(0 if ok else 1)
