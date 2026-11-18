# AnimalScope AI: Step-by-step guide (Windows, VS Code, GitHub, Render, Vercel)

Nothing in this project has been deployed yet. Follow the parts in order. Each part ends with a check so you know it worked.

**Order:** Part 1 install tools → Part 2 run locally → Part 3 verify the model → Part 4 GitHub → Part 5 Render (backend) → Part 6 Vercel (website) → Part 7 connect them.

---

## Part 1. Install the tools (one time)

| Tool | Where to get it | Notes |
|------|-----------------|-------|
| **Python 3.11** | https://www.python.org/downloads/windows/ (pick a 3.11.x installer) | On the first installer screen tick **"Add python.exe to PATH"**. Avoid the very newest Python; TensorFlow supports a limited range. |
| **Node.js (LTS)** | https://nodejs.org | Needs version 20.19 or newer. Accept the defaults. |
| **Git** | https://git-scm.com/download/win | Accept the defaults. |
| **VS Code** | https://code.visualstudio.com | You already have this. |

Close and re-open VS Code after installing. Then open a terminal in VS Code (**Terminal → New Terminal**) and check:

```powershell
py -3.11 --version
node --version
git --version
```
You should see three version numbers. If `py -3.11` says it cannot find Python 3.11, re-run the Python installer.

---

## Part 2. Run the website on your own laptop

1. Unzip `AnimalScope-AI.zip` somewhere simple, for example `C:\Projects\AnimalScope-AI`.
2. In VS Code choose **File → Open Folder…** and select the `AnimalScope-AI` folder (the one that contains `frontend` and `backend`).

### 2a. Start the backend (first terminal)

Open **Terminal → New Terminal** and run these one at a time:

```powershell
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
```
Your prompt should now start with `(.venv)`.

> **If you see "running scripts is disabled on this system":** run
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, then repeat the `Activate.ps1` line.

```powershell
pip install -r requirements.txt
```
This downloads TensorFlow (large). It can take several minutes. Then:

```powershell
uvicorn app:app --host 127.0.0.1 --port 8000
```
The model loads in the background. Wait for a log line like `Model loaded and warmed up in ...s`.

**Check:** open http://127.0.0.1:8000/health in your browser. You want `"status":"ready"` and `"classes":["Cat","bird","dog"]`.
If you see `"status":"loading"`, wait a few seconds and refresh. If you see `"status":"error"`, read the `error` text and the terminal log
(see Troubleshooting).

### 2b. Start the website (second terminal)

Click the **+** in the terminal panel to open a second terminal, then:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```
Open http://localhost:5173. The pill above the upload card should say **Model online**. Upload a cat, dog or bird picture and click **Predict Animal**.

To stop either server press **Ctrl + C** in its terminal.

---

## Part 3. Verify the model against your notebook (recommended)

This is the one test that could not be run when the project was built. In the **backend** terminal (with `(.venv)` active, server stopped or in a third terminal):

```powershell
cd backend
python verify_model.py "C:\path\to\a_cat.jpg" "C:\path\to\a_dog.jpg" "C:\path\to\a_bird.jpg"
```
Use real photos. For each image it prints the notebook's answer and the website pipeline's answer, and the final line should be
`OVERALL: PASS`. If it says FAIL, do not deploy; send me the output.

---

## Part 4. Put the project on GitHub

**Easiest way: GitHub Desktop (no commands)**

1. Create a free account at https://github.com, install **GitHub Desktop** from https://desktop.github.com and sign in.
2. In GitHub Desktop: **File → Add local repository…** → choose your `AnimalScope-AI` folder → if it says "not a Git repository", click **create a repository**.
3. Name: `AnimalScope-AI`. Leave everything else, click **Create repository**.
4. Click **Publish repository** (top bar). Untick "Keep this code private" only if you want it public. Click **Publish**.

**Or with commands** (after creating an empty repository on github.com via **+ → New repository**, name `AnimalScope-AI`, and do **not** tick "Add a README" or ".gitignore"):

```powershell
cd C:\Projects\AnimalScope-AI
git init
git add .
git commit -m "Initial commit: AnimalScope AI"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/AnimalScope-AI.git
git push -u origin main
```
A browser window may ask you to sign in to GitHub the first time.

**Check:** on github.com open your repository. You should see `frontend`, `backend`, `README.md`, and inside `backend` the file
`animal_classifier.keras` (about 9.7 MB, well under GitHub's 100 MB limit, so no special setup is needed).
You should **not** see `node_modules`, `.venv` or `.env` (the `.gitignore` file keeps them out).

> Your Colab notebook contains your Roboflow API key and is not part of this project. Keep it out of public repositories.

---

## Part 5. Deploy the backend on Render

> **Please read first: memory.** TensorFlow needs a lot of RAM. Render's free plan has 512 MB, which may be too little, and this
> could not be tested here. If the service keeps restarting or the log says it ran out of memory, you need a plan with more RAM
> (check https://render.com/pricing, since plans change) or another host for the backend. The free plan also **sleeps after ~15 minutes
> idle**, and waking it up and reloading the model can take a minute or more. The website shows a "waking up" message while that happens.

1. Sign up at https://render.com (you can use your GitHub account).
2. Click **New + → Web Service**.
3. **Connect** your GitHub account and select the `AnimalScope-AI` repository.
4. Fill in:

   | Field | Value |
   |-------|-------|
   | Name | `animalscope-ai-backend` (this becomes part of your URL) |
   | Language | `Python 3` |
   | Branch | `main` |
   | **Root Directory** | `backend` |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn app:app --host 0.0.0.0 --port $PORT` |
   | Instance Type | Free to try, or a larger plan if memory is a problem |

5. Open **Environment Variables** (Advanced) and add:

   | Key | Value |
   |-----|-------|
   | `PYTHON_VERSION` | `3.11.9` |
   | `ALLOWED_ORIGINS` | `http://localhost:5173` for now (you will change it in Part 7) |
   | `TF_CPP_MIN_LOG_LEVEL` | `2` |

6. Click **Create Web Service**. The first build takes several minutes (TensorFlow is big). Watch the **Logs** tab.
7. When it says the service is live, copy the URL at the top, for example `https://animalscope-ai-backend.onrender.com`.

**Check:** open `https://YOUR-SERVICE.onrender.com/health`. You want `"status":"ready"` (it may say `loading` for a short while first).
Interactive API documentation is at `https://YOUR-SERVICE.onrender.com/docs`.

*Alternative:* this repository includes `render.yaml`. In Render choose **New + → Blueprint**, select the repository, and it fills the
settings above for you (you still enter `ALLOWED_ORIGINS` yourself).

---

## Part 6. Deploy the website on Vercel

1. Sign up at https://vercel.com with your GitHub account.
2. Click **Add New… → Project** and **Import** the `AnimalScope-AI` repository.
3. On the configuration screen:

   | Field | Value |
   |-------|-------|
   | Framework Preset | `Vite` (usually detected automatically) |
   | **Root Directory** | click **Edit** and choose `frontend` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

4. Open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | your Render URL, e.g. `https://animalscope-ai-backend.onrender.com` (**no slash at the end**) |

5. Click **Deploy**. When finished, copy your website address, for example `https://animalscope-ai.vercel.app`.

> `VITE_API_URL` is baked into the website when it is built. If you change it later, redeploy: **Deployments → ⋯ → Redeploy**.

---

## Part 7. Connect the website and the backend

The backend only accepts requests from addresses you list. Go back to Render:

1. Open your service → **Environment**.
2. Change `ALLOWED_ORIGINS` to your Vercel address, exactly as shown in the browser, with no trailing slash:
   `https://animalscope-ai.vercel.app`
   (Several addresses can be separated by commas, e.g. `https://animalscope-ai.vercel.app,http://localhost:5173`.)
3. **Save changes.** Render redeploys automatically.

**Final check:** open your Vercel website. The pill should say **Model online** (give a sleeping free server about a minute).
Upload an image and click **Predict Animal**.

Only after this works should you describe the website as live.

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| Browser console shows a **CORS** error | `ALLOWED_ORIGINS` on Render does not exactly match your website address (check `https`, spelling, no trailing slash). Save and wait for the redeploy. |
| Pill says **Server unreachable** | Backend is asleep, still starting, or `VITE_API_URL` is wrong. Open `<backend URL>/health` directly. Wait a minute and retry. |
| Pill stays on **Model is loading** | TensorFlow is still loading the model; wait. If it never finishes, check the Render logs for memory errors. |
| `/health` shows `"status":"error"` | Read the `error` text. Typical causes: a TensorFlow/Keras version that cannot read the model (see below) or a missing file. |
| Render build fails on `tensorflow` | In `backend/requirements.txt` the `tensorflow>=2.20` line needs a Python version TensorFlow supports. Keep `PYTHON_VERSION=3.11.9`. |
| Model fails to load with a Keras / Lambda message | Your model was saved with Keras 3.13.2. Make sure the installed Keras is at least that (`pip show keras`). The app already passes `custom_objects` like your notebook, and retries with `safe_mode=False` for your own trusted file. |
| Service restarts or "out of memory" on Render | The plan has too little RAM for TensorFlow. Use a larger plan, or host the backend somewhere with more memory. A smaller export of the model (for example TensorFlow Lite) is another option; ask for help converting it. |
| `Activate.ps1 cannot be loaded` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then try again. |
| `Port 8000 is already in use` | Close the other terminal running the server, or use `--port 8001` (and put that port in `frontend\.env`). |
| Website changes in `.env` are ignored | Stop `npm run dev` with Ctrl + C and start it again. |
| First prediction after idle is slow | Free hosting sleeps. This is normal; later predictions are fast. |
