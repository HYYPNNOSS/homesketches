```bash
cd ~/Desktop/finalsketch/sketchfront

# 1. Remove old Git history completely
rm -rf .git

# 2. Create a clean Next.js .gitignore
cat > .gitignore <<'EOF'
node_modules/
.next/
out/
build/
dist/
.vercel/

.env*
!.env.example
!.env.sample

*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

coverage/
.turbo/
*.tsbuildinfo

.DS_Store
Thumbs.db
.idea/
.vscode/

# Local certificates and secrets
*.pem
*.key
*.crt
EOF

# 3. Initialize a completely new repository on main
git init -b main

# 4. Connect the GitHub repository
git remote add origin git@github.com:HYYPNNOSS/homesketches.git

# 5. Stage and commit the project
git add .
git status
git commit -m "Initial commit"

# 6. Push to GitHub
git push -u origin main
```
