---
version: alpha
name: SynapseIQ-design-system
description: An inspired premium dark-mode interpretation of the SynapseIQ design language — an AI-Powered Organization Brain built on a rich dark forest-and-gold system. The brand reads as cinematic, highly-engineered, and technically precise, using a void-black midnight forest canvas, a dominant emerald moss green highlight, a premium champagne-gold accent, and off-white pearl typography.

colors:
  primary: "#2F7D5B"           # Emerald Moss Green (Signature brand highlight)
  primary-deep: "#1B543B"      # Pressed Emerald Moss Green
  primary-soft: "#48A87C"      # Glowing Emerald Moss Green
  accent: "#E0C390"            # Champagne Gold / Sand (Premium contrast accent)
  accent-deep: "#C3A470"       # Muted Sand Gold
  accent-soft: "#F5EAD4"       # Pale Sand Gold Highlight
  canvas: "#0A0E0C"            # Midnight Forest Dark (Background)
  canvas-surface: "#121815"    # Forest Dark Card Surface
  canvas-surface-soft: "#161F1B" # Lifted Forest Dark Surface
  text-main: "#F3F5F2"         # Soft Pearl Off-white (Default text)
  text-secondary: "#C5C9C3"    # Muted Pearl
  text-mute: "#8E948B"         # Secondary helper text
  text-disabled: "#5E635B"     # Disabled placeholder text
  hairline-glass: "rgba(243, 245, 242, 0.08)" # Signature glass border line
  hairline-glass-strong: "rgba(243, 245, 242, 0.16)"
  glow-green: "rgba(47, 125, 91, 0.25)" # Background green glow
  glow-gold: "rgba(224, 195, 144, 0.15)" # Background gold glow

typography:
  display-xxl:
    fontFamily: "'Steelfish', 'Impact', 'Arial Narrow', sans-serif"
    fontSize: 72px
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: 1.5px
    textTransform: "uppercase"
  display-xl:
    fontFamily: "'Steelfish', 'Impact', 'Arial Narrow', sans-serif"
    fontSize: 52px
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: 1px
    textTransform: "uppercase"
  display-lg:
    fontFamily: "'Steelfish', 'Impact', 'Arial Narrow', sans-serif"
    fontSize: 38px
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: 0.5px
    textTransform: "uppercase"
  display-md:
    fontFamily: "'Steelfish', 'Impact', 'Arial Narrow', sans-serif"
    fontSize: 28px
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0.5px
    textTransform: "uppercase"
  heading-lg:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.2px
  heading-md:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-md:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  button-md:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.0
    letterSpacing: 0.2px
  caption:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  micro:
    fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.5px
    textTransform: "uppercase"
  code:
    fontFamily: "ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  xs: 4px      # Input boxes, tags
  sm: 6px      # Buttons (Signature square-ish buttons)
  md: 8px      # Alerts, dialog panels
  lg: 12px     # Card frames, code blocks
  xl: 16px     # Top banner wrapper
  full: 9999px # Notification badge pill

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  huge: 64px

components:
  button-primary-green:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: 10px 18px
  button-accent-gold:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: 10px 18px
  button-outline-green:
    backgroundColor: "transparent"
    textColor: "{colors.primary-soft}"
    border: "1px solid {colors.primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: 10px 18px
  button-outline-gold:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    border: "1px solid {colors.accent}"
    typography: "{typography.button-md}"
    rounded: "{rounded.sm}"
    padding: 10px 18px
  card-glass:
    backgroundColor: "{colors.canvas-surface}"
    textColor: "{colors.text-main}"
    border: "1px solid {colors.hairline-glass}"
    backdropFilter: "blur(16px)"
    rounded: "{rounded.lg}"
    padding: 24px
  text-input-dark:
    backgroundColor: "rgba(0, 0, 0, 0.4)"
    textColor: "{colors.text-main}"
    border: "1px solid {colors.hairline-glass}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xs}"
    padding: 8px 12px
  pill-tag-gold:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  pill-tag-green:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-main}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 2px 8px
---

## SECTION 1: MARKETING LANDING PAGE (HOME)
*Route: `/`*

### 1.1 Header Navbar Layout
- **Style**: Transparent glass-blur bar sticky at the top, max-width `1280px` container.
- **Left**: "SYNAPSEIQ" display-md bold header in Pearl White, with a Gold accent tag "B.1.0" pill-tag.
- **Center**: Nav links (Home, Features, How it Works, Target Users) in text-secondary, hover color shifts to primary green.
- **Right**: "Enter App" button-outline-gold leading to `/login`.

### 1.2 Animated Hero Section
- **Left Panel (Copy)**:
  - Header: Steelfish display-xxl: "SYNAPSEIQ: THE AI ORG BRAIN". 
  - Text: Body-lg in text-secondary: "A next-generation unified team workspace that consolidates chats, tasks, and files into a single vectorized AI brain."
  - CTA Group: Pinned bottom. A filled `button-accent-gold` ("Register Account") and secondary `button-outline-green` ("View Test Guide").
- **Right Panel (Immersive Graphic)**:
  - Center: An abstract glowing radial moss green sphere graphic, rotating slowly.
  - Composition: 3 floating `card-glass` panel components positioned in layers:
    * Panel A: "System: ACTIVE" log box.
    * Panel B: Mock graph showing indexing speed.
    * Panel C: "vector: 384d dimensions" status.

### 1.3 "What is SynapseIQ?" Section
- **Layout**: Centered title in display-xl. Two-column grid layout below.
- **Left Column**: High-density editorial description explaining how the tool acts as a single tenant container. It replaces Slack, Trello, and Google Drive.
- **Right Column**: Inset screenshot frame of the workspace dashboard page in a rounded container with a thin gold border outline.

### 1.4 Interactive Features Grid
- **Layout**: 3-column grid of `card-glass` components.
- **Card 1 (Chats)**: Mini chat UI styling with green user bubbles.
- **Card 2 (Tasks)**: Mini Kanban card mockup with status labels.
- **Card 3 (Documents)**: File icon with version indicators (V1, V2, V3).
- **Card 4 (Meetings)**: Transcript notepad layout and auto-summary tag.
- **Card 5 (Vector DB)**: Mock input box showing simulated neural pathways.

### 1.5 "How it Works" RAG Simulation
- **Layout**: Full-width `card-glass` workflow simulator.
- **Phase A (Input)**: Text input visual box, auto-typing characters: *"Who runs oauth configurations?"*
- **Phase B (Processing)**: An SVG connection line starts drawing dynamically from input box to a Database Vault icon using gold strokes.
- **Phase C (Output)**: AI response bubble card fades in: *"AI Brain Answer: OAuth is configured inside .env as confirmed by John in Yesterday's Meeting."*

### 1.6 Target Users Section
- **Layout**: 3-column cards.
- **Column 1**: "Developers" card with code theme.
- **Column 2**: "Sprint Managers" card with progress theme.
- **Column 3**: "Enterprise Teams" card with security lock theme.

### 1.7 Footer Layout
- **Style**: Canvas-surface background, 4-column column link groups, text-mute colors. Pinned copyright notice at the bottom.

---

## SECTION 2: AUTHENTICATION PAGES (SIGNUP & LOGIN)
*Routes: `/signup` & `/login`*

### 2.1 Sign Up Screen Layout
- **Container**: Page background `#0A0E0C`. A single `card-glass` box centered vertically and horizontally.
- **Header**: "Create Account" in display-lg, subtext in text-secondary.
- **Fields**: Three `text-input-dark` blocks: "Full Name", "Email Address", "Password".
- **CTA**: Filled `button-accent-gold` ("Sign Up") spanning full card width.
- **Link**: Pinned bottom text link leading to `/login`.

### 2.2 Log In Screen Layout
- **Container**: Same centered frame.
- **Header**: "Welcome Back" in display-lg.
- **Fields**: Two `text-input-dark` blocks: "Email Address", "Password".
- **CTA**: Filled `button-primary-green` ("Log In") spanning full card width.
- **Link**: Pinned bottom text link leading to `/signup`.

---

## SECTION 3: WORKSPACES SELECTION PAGE
*Route: `/workspaces`*

### 3.1 Header Layout
- **Branding**: "SYNAPSEIQ" logo.
- **Logout Action**: Outline log-out button on the right.

### 3.2 Two-Column Split Layout
- **Left Column (Workspace List)**:
  - Lists existing workspaces in vertical `card-glass` modules.
  - Hovering over a card highlights its border in green, displaying a gold text link indicator: *"Enter ➔"*.
- **Right Column (Workspace Creation Form)**:
  - A dedicated `card-glass` containing form fields: "Workspace Slug ID" (e.g. TECH-01) and "Workspace Name".
  - Submit button: Pinned full-width `button-primary-green`.

---

## SECTION 4: WORKSPACE HUB DASHBOARD (INNER APP)
*Route: `/workspaces/[workspace_id]`*

### 4.1 Shell Layout
- **Top Header Bar**: Height 64px. Holds logo, Workspace ID segment link, Bell Icon indicator on the right with a dynamic Gold badge, and User details.
- **Left Sidebar**: Width 256px. Filled in Canvas-Surface (#121815) color. Vertically displays module buttons. The active button has a Green background with white text, others are neutral gray.
- **Main Panel Area**: The primary viewport container displaying the active tab's layout.

### 4.2 Dynamic Tab Panels Layout

#### **Tab A: Dashboard Analytics**
- Top row shows 3 statistics boxes in `card-glass`: Member counts, total tasks, and completion ratios.
- Main area: Weekly progress AI generation panel with a large gold CTA button: "Analyze & Generate".

#### **Tab B: Team Chat**
- Left sub-panel: List of active channels with a small "+ Add Channel" input button at the bottom.
- Center message stream: Bubbles lined vertically with sender tags and message timestamps.
- Bottom chat input bar: Flat input with "Send" button.
- Right sub-panel (Drawer): Sliding drawer for Thread replies. Opens when clicking "Reply in Thread".

#### **Tab C: Projects & Kanban**
- 3 columns laid horizontally: "To Do", "In Progress", "Done".
- Task cards nested inside the columns. Each card is a small `card-glass` with task titles, descriptions, and assignee tag.
- Bottom creator panel: Fields to add tasks (title, description, assignee dropdown selection).

#### **Tab D: Document Storage**
- Split view: Left side displays document list rows. Right side shows a selected file's version history download logs.
- Top bar: Upload form containing file input and Category string box.

#### **Tab E: Meetings Intelligence**
- Left side: List of scheduled meeting details.
- Right side: Split panels. Top shows meeting transcript editor. Bottom shows AI summary outputs (Action items list in monospace font).

#### **Tab F: AI Knowledge Brain**
- A centered search bar with gold outline: *"Ask AI Org Brain..."*.
- Underneath shows RAG answers container displaying the generated text in Pearl White with code block references.

#### **Tab G: Notifications Feed**
- Simple clean alerts feed card layout listing channel @mentions with a "Mark Read" gold text button.

---

## SECTION 5: ROLE-BASED UI VARIATIONS (ADMIN VS MEMBER)

The dashboard layout varies dynamically depending on the user's workspace membership role to preserve correct security and controls:

### 5.1 Team Head (Admin / Owner) UI Specifications
- Full access to all editing/creating components.
- **Chat**: Displays the "+ Add Channel" creator form at the bottom of the channels list.
- **Projects**: Displays the "+ Add Project" and "+ Add Task" creation cards.
- **Documents**: Displays the "Upload File" drag-and-drop panel.
- **Meetings**: Displays the "Schedule Meeting" creator card.

### 5.2 Team Member UI Specifications
- Read-only on administrative actions; creator inputs are hidden.
- **Chat**: Displays channels and allows sending messages, but the "+ Add Channel" form is completely hidden.
- **Projects**: Can view tasks and toggle statuses of their assigned cards, but the "+ Add Project" and "+ Add Task" creation cards are hidden.
- **Documents**: Displays documents list and version downloads, but the file upload form is hidden.
- **Meetings**: Displays scheduled meetings and transcripts, but the "Schedule Meeting" creator card is hidden.
