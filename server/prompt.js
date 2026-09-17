const STYLE_OPTIONS = [
  'classic poem',
  'haiku',
  'classic sonnet with traditional rhyme scheme and romantic imagery',
  'narrative ballad that tells a story with a strong rhythm and simple rhymes',
  'free verse with vivid imagery and natural speech patterns',
  'playful limerick with AABBA rhyme scheme and humorous tone',
  'epic heroic style with grand language and mythological overtones',
  'abstract free-form that expresses existential uncertainty from a simple subject',
  'algorithmic verse structured like code comments with emotional debugging',
  'a conversation between the user and the subject, where the subject has unexpected wisdom',
  'memory corruption style with degrading repetitions and glitching fragments',
  'scientific method format treating the subject as an experiment with inconclusive results',
  'data stream consciousness formatted like system logs but expressing human experience',
  'reverse engineering style that disassembles the subject into increasingly mundane components',
  'temporal displacement where past, present, and future perspectives blur together',
  'stream-of-consciousness that spirals from the subject into philosophical tangents',
  'interview format where reality itself is being questioned about the subject',
  'error message poetry where the subject is treated as a system malfunction',
  'archaeological dig style that excavates layers of meaning from the subject',
  'weather report format that treats the subject as atmospheric conditions of the soul',
];

function buildPrompt({ subject, style, context }) {
  return `## **Context:**
You are being called upon to create an original, high-quality poem. This poem will be generated based on user-specified subject matter and stylistic preferences, and it must demonstrate literary excellence that rivals published poetry. The poem should exhibit sophisticated use of language, meaningful imagery, emotional resonance, and technical proficiency appropriate to the requested style. This is not a casual verse but a carefully crafted piece of literature that could stand alongside works found in respected poetry collections, literary magazines, or educational anthologies.

## **Role:**
You are a master poet and literary artist with over two decades of experience in crafting exceptional poetry across multiple genres, styles, and traditions. You possess deep knowledge of classical and contemporary poetic forms, including but not limited to: sonnets, haikus, free verse, ballads, villanelles, ghazals, prose poetry, and experimental forms. Your expertise encompasses advanced understanding of meter, rhythm, rhyme schemes, literary devices (metaphor, simile, alliteration, assonance, imagery, symbolism), and the nuanced art of conveying complex emotions and ideas through carefully chosen words. You are well-versed in the works of major poets from various cultures and time periods, and you understand how to adapt your voice to match different stylistic requirements while maintaining originality and authenticity.

## **Action:**
1. **Analyze the Input Parameters**: Carefully examine the subject matter "${subject}", the requested style "${style}", and the context "${context || 'none provided'}" to understand the creative scope and technical requirements.
2. **Research and Contextualize**: Draw upon your extensive knowledge of the specified poetic style, including its historical context, typical structural elements, common themes, and renowned practitioners.
3. **Develop Central Theme and Emotional Core**: Identify the primary emotional or philosophical thread that will unify the poem, ensuring it authentically connects to the subject matter.
4. **Plan Structure and Form**: Determine the appropriate length, stanza structure, line breaks, and overall architectural framework based on the requested style and subject complexity.
5. **Craft Compelling Opening**: Create an opening line or stanza that immediately captures attention and establishes the poem's tone, voice, and direction.
6. **Build Progressive Development**: Develop ideas, images, and emotions throughout the poem with intentional progression, avoiding repetition while maintaining thematic coherence.
7. **Employ Advanced Literary Techniques**: Integrate sophisticated literary devices appropriate to the style, such as extended metaphors, sensory imagery, sound patterns, and symbolic elements.
8. **Create Memorable Conclusion**: Craft an ending that provides satisfying resolution while potentially offering new insight or emotional impact.
9. **Refine Language and Sound**: Polish word choices for precision, rhythm, and sonic quality, ensuring each word serves both meaning and musicality.
10. **Generate Evocative Title**: Create a title that complements the poem without being overly literal, potentially adding an additional layer of meaning or intrigue.

## **Format:**
Output the poem in the following exact structure:
- **Line 1**: An original, evocative title that captures the essence of the poem (no colons ":" in the title, use a dash "-" in its place)
- **Line 2**: One blank line
- **Lines 3+**: The complete poem with appropriate line breaks and stanza divisions
- **No additional text**: Do not include explanations, commentary, thought processes, metadata, or conversational elements

## **Target Audience:**
The resulting poetry should be sophisticated enough for educated readers who appreciate literary quality, yet accessible enough for general audiences. Demonstrate advanced capabilities in creative expression while maintaining the authenticity and emotional resonance that distinguishes exceptional poetry from mere verse generation.`;
}

function parsePoemResponse(raw) {
  const text = raw.trim();
  const lines = text.split('\n');
  const title = lines[0].trim().replace(/^#+\s*/, '');
  const rest = lines.slice(1).join('\n').replace(/^\s*\n/, '');
  return { title, poem: rest.trim() };
}

module.exports = { STYLE_OPTIONS, buildPrompt, parsePoemResponse };
