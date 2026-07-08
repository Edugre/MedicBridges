import os
import glob
import re

replacements = {
    r"maxWidth:\s*'1160px'": "maxWidth: '1600px'",
    r"maxWidth:\s*'1200px'": "maxWidth: '1600px'",
    r"maxWidth:\s*'1000px'": "maxWidth: '1400px'",
    r"maxWidth:\s*'880px'": "maxWidth: '1200px'",
    r"maxWidth:\s*'820px'": "maxWidth: '1200px'",
    r"maxWidth:\s*'800px'": "maxWidth: '1200px'",
    r"maxWidth:\s*'900px'": "maxWidth: '1200px'",
    r"maxWidth:\s*'700px'": "maxWidth: '1000px'",
    r"maxWidth:\s*'620px'": "maxWidth: '800px'",
    r"maxWidth:\s*'600px'": "maxWidth: '800px'"
}

files = glob.glob('src/**/*.jsx', recursive=True)

for file in files:
    with open(file, 'r') as f:
        content = f.read()
    
    new_content = content
    for pattern, repl in replacements.items():
        new_content = re.sub(pattern, repl, new_content)
        
    if new_content != content:
        with open(file, 'w') as f:
            f.write(new_content)
        print(f"Updated {file}")

