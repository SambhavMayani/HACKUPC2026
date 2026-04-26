# ADtonomy Creative Intelligence Dashboard


The idea is to help as much as possible the marketer to have insights of its business>

We give feedback about the business and about famous advertising metrics.

We group in clusters the ads, give the information to an AI to translate the data from numbers and stadistics known by a data scientist to plain text identifying each group.

A recommendation system that checks the trending news regarding the topic of your add, because you probably get the attention of someone interested in geopolitics with words like "Iran" or "Trump" or of a gamer by saying or letting the subniminal message or ad colors of "GTA 6"



## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy the example environment file and configure any necessary variables:
   ```bash
   cp .env.example .env.local
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   *Note: The development server is configured to run on port 80 (`next dev -p 80`). Depending on your OS, you might need administrative privileges (e.g., `sudo npm run dev`) or you can change the port in `package.json`.*

4. **Open the application:**
   Navigate to [http://localhost](http://localhost) (or the corresponding port) in your browser to see the dashboard.

## Building for Production

To create an optimized production build:

```bash
npm run build
```

Then, to start the production server:

```bash
npm run start
```

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **UI Library:** [React](https://reactjs.org/)
- **Charts:** [Recharts](https://recharts.org/)
- **Data Processing:** [PapaParse](https://www.papaparse.com/)


## Dataset

This dashboard is designed to work with the `ADtonomy_Creative_Intelligence_Dataset_FULL` dataset, parsing and visualizing its contents for actionable intelligence.
