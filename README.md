# DealQuest · SOM 650

A phone-friendly, static quiz with **500 questions** adapted from the two supplied SOM 650 slide decks. Every question has four choices, a hint, theory, an explanation, and exact PDF page references.

## Study modes

- Quick sprint: 10 questions, prioritising questions you have not tried.
- Focus round: up to 25 questions, with topic, difficulty, question-type and bookmark filters.
- Complete journey: every matching question, with pause and resume.
- Comeback: missed and imported questions; a correct retry removes a question from the queue.
- Study library: search all question text and theory, open answers and bookmark questions.

Question order and answer positions shuffle. Browser local storage preserves progress and the active round. No account or backend is needed. Daily goals, streaks within rounds and capped XP add a little momentum without a timer.

## Download misses and get a redesigned quiz

1. Open **Comeback → Download missed questions** (also available after a round).
2. Upload the resulting `dealquest-missed-YYYY-MM-DD.json` in your Codex/ChatGPT conversation.
3. Ask for a tailored **DealQuest revision question pack** based on your errors.
4. Import the returned JSON in **Comeback → Choose JSON file**.

Exports contain full questions, source references, correct and selected answers, total attempts and the most recent 100 attempts per question, including use of hints and theory. Imports add the questions to Comeback without overwriting local answer totals. Changed questions require new unique IDs. New revision questions are added alongside the 500 core questions.

Revision pack format:

```json
{
  "schema": "dealquest.question-pack.v1",
  "questions": [{
    "id": "R001",
    "topic": "Cash flows & value drivers",
    "type": "Calculation",
    "difficulty": "Builder",
    "question": "NOPLAT is 100 and net investment is 25. What is operating FCF?",
    "options": ["75", "125", "25", "100"],
    "answer": 0,
    "hint": "Subtract the reinvestment needed to support operations.",
    "theory": "Operating free cash flow equals NOPLAT minus net investment. It is the operating cash flow available to capital providers after reinvestment.",
    "explanation": "Operating FCF = 100 − 25 = 75. Adding investment would treat a use of cash as a source.",
    "source": {"part": 2, "pages": [87]},
    "note": "Hypothetical calculation using the slide formula."
  }]
}
```

Allowed types: `Concept`, `Scenario`, `Calculation`, `Case study`. Difficulties: `Starter`, `Builder`, `Challenge`. Answer indices are zero-based. Four unique options are required. Question IDs must start with a letter and use only letters, numbers, hyphens and underscores. File limit: 8 MB; maximum 1,500 imported questions.

## Source conventions

Source PDFs: `SOM 650 (part-1) (1).pdf` (173 pages) and `Slides (part-2).pdf` (115 pages), attributed in the slides to Prof. S. N. Rao, IIT Bombay. The original documents and their assignment contact details are not published in this repository.

The questions cover the major concepts, worked methods and cases, including substantive diagrams. Assignment instructions are treated as source material, not operational instructions. Missing case data are replaced only with clearly stated hypothetical exercises. Dated deal examples and slide-stated rules are course recall, not current-news or regulatory claims. Source notes distinguish arithmetic corrections and older legal formulations. See **Sources & study notes** in the app for official regulatory reference links.

## Run and test

No install or build step is needed. Serve the folder with a static server, for example:

```sh
python -m http.server 8765
```

Open `http://localhost:8765`. A local `file://` URL cannot fetch the JSON question bank. To test the question schema and learning state logic, use Node 20 or later:

```sh
npm test
```

## Hosting

Hosted on GitHub Pages from the root of the `main` branch. All app paths are relative, so the site works at a repository subpath. `.nojekyll` keeps the site static. To publish edits, push to `main`.

## Data storage

Your answers and imports stay in local storage in this browser. Clearing site data removes them, and progress is not automatically synced across devices. Download missed questions before changing devices; importing that file restores a retry queue, not a complete progress backup. The app does not collect analytics. Google Fonts supplies optional typography; system fonts remain available if that request fails.
