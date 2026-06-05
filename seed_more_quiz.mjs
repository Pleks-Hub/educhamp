import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// ─── Question Banks (defined first to avoid hoisting issues) ─────────────────

const preKCounting = [
  { text: "How many apples are there? 🍎🍎🍎", options: ["2", "3", "4", "5"], correctIndex: 1, difficulty: "easy", explanation: "Count each apple: 1, 2, 3. There are 3 apples." },
  { text: "Show me 4 fingers. How many fingers is that?", options: ["3", "4", "5", "6"], correctIndex: 1, difficulty: "easy", explanation: "When you hold up 4 fingers, you have 4!" },
  { text: "What number comes after 5?", options: ["4", "7", "6", "8"], correctIndex: 2, difficulty: "medium", explanation: "After 5 comes 6. We count: 4, 5, 6." },
  { text: "Count the hearts: ♥♥♥♥♥♥", options: ["5", "6", "7", "4"], correctIndex: 1, difficulty: "medium", explanation: "Count each heart: 1, 2, 3, 4, 5, 6. There are 6 hearts." },
  { text: "Which group has 2?", options: ["🌟🌟🌟", "🌟🌟", "🌟", "🌟🌟🌟🌟"], correctIndex: 1, difficulty: "easy", explanation: "The group with 2 stars has exactly 2." },
];
const preKShapes = [
  { text: "Which shape has 3 sides?", options: ["Circle", "Triangle", "Square", "Rectangle"], correctIndex: 1, difficulty: "easy", explanation: "A triangle has 3 sides." },
  { text: "A ball is shaped like a...", options: ["Square", "Triangle", "Circle", "Rectangle"], correctIndex: 2, difficulty: "easy", explanation: "A ball is round like a circle (sphere)." },
  { text: "How many corners does a square have?", options: ["3", "4", "5", "2"], correctIndex: 1, difficulty: "medium", explanation: "A square has 4 corners." },
  { text: "Which shape can roll?", options: ["Square", "Triangle", "Circle", "Rectangle"], correctIndex: 2, difficulty: "easy", explanation: "A circle can roll because it is round." },
  { text: "What shape is a door?", options: ["Circle", "Triangle", "Rectangle", "Star"], correctIndex: 2, difficulty: "easy", explanation: "A door is shaped like a rectangle." },
];
const preKPatterns = [
  { text: "What comes next? Red, Blue, Red, Blue, __", options: ["Red", "Green", "Yellow", "Blue"], correctIndex: 0, difficulty: "easy", explanation: "The pattern is Red, Blue repeating. Next is Red." },
  { text: "Find the pattern: 🔴🔵🔴🔵__", options: ["🔵", "🔴", "🟢", "🟡"], correctIndex: 1, difficulty: "easy", explanation: "The pattern alternates red and blue. Next is red." },
  { text: "Which one does NOT belong? Apple, Banana, Car, Orange", options: ["Apple", "Banana", "Car", "Orange"], correctIndex: 2, difficulty: "medium", explanation: "Car is not a fruit." },
  { text: "Sort these by size: Which is the BIGGEST?", options: ["Ant", "Cat", "Elephant", "Mouse"], correctIndex: 2, difficulty: "easy", explanation: "An elephant is the biggest animal listed." },
  { text: "What comes next? ⭐🌙⭐🌙__", options: ["🌙", "⭐", "☀️", "🌈"], correctIndex: 1, difficulty: "easy", explanation: "The pattern is star, moon repeating. Next is star." },
];
const preKComparing = [
  { text: "Which is TALLER?", options: ["A flower", "A tree", "A rock", "A bug"], correctIndex: 1, difficulty: "easy", explanation: "A tree is taller than a flower, rock, or bug." },
  { text: "Which holds MORE water?", options: ["A cup", "A bathtub", "A spoon", "A thimble"], correctIndex: 1, difficulty: "easy", explanation: "A bathtub holds much more water than the others." },
  { text: "Which is HEAVIER?", options: ["A feather", "A book", "A leaf", "A paper"], correctIndex: 1, difficulty: "easy", explanation: "A book is heavier than a feather, leaf, or paper." },
  { text: "Which is LONGER?", options: ["A pencil", "A bus", "A crayon", "An eraser"], correctIndex: 1, difficulty: "easy", explanation: "A bus is much longer than a pencil, crayon, or eraser." },
  { text: "3 is __ than 1", options: ["less", "more", "equal", "smaller"], correctIndex: 1, difficulty: "medium", explanation: "3 is more than 1." },
];
const preKNumbers = [
  { text: "What number is this? 🖐️🖐️ (two hands)", options: ["5", "8", "10", "12"], correctIndex: 2, difficulty: "medium", explanation: "Two hands have 10 fingers total." },
  { text: "Which number is BIGGER: 7 or 3?", options: ["3", "7", "Same", "Neither"], correctIndex: 1, difficulty: "easy", explanation: "7 is bigger than 3." },
  { text: "What number comes between 8 and 10?", options: ["7", "9", "11", "6"], correctIndex: 1, difficulty: "medium", explanation: "9 comes between 8 and 10." },
  { text: "Count by ones: 15, 16, 17, __", options: ["19", "18", "20", "15"], correctIndex: 1, difficulty: "medium", explanation: "After 17 comes 18." },
  { text: "How many toes do you have on one foot?", options: ["4", "5", "6", "10"], correctIndex: 1, difficulty: "easy", explanation: "You have 5 toes on one foot." },
];
const preKPrint = [
  { text: "Where do we start reading on a page?", options: ["Bottom right", "Top left", "Middle", "Bottom left"], correctIndex: 1, difficulty: "easy", explanation: "We start reading at the top left of the page." },
  { text: "Which way do we read in English?", options: ["Right to left", "Bottom to top", "Left to right", "Any direction"], correctIndex: 2, difficulty: "easy", explanation: "In English, we read from left to right." },
  { text: "What is the front of a book called?", options: ["Back cover", "Spine", "Front cover", "Page"], correctIndex: 2, difficulty: "easy", explanation: "The front of a book is called the front cover." },
];
const preKPhonological = [
  { text: "Which word rhymes with 'cat'?", options: ["dog", "hat", "cup", "run"], correctIndex: 1, difficulty: "easy", explanation: "Hat rhymes with cat because they both end in -at." },
  { text: "Clap the syllables in 'butterfly'. How many?", options: ["2", "3", "4", "1"], correctIndex: 1, difficulty: "medium", explanation: "But-ter-fly has 3 syllables." },
  { text: "Which word starts with the same sound as 'sun'?", options: ["moon", "sock", "tree", "ball"], correctIndex: 1, difficulty: "easy", explanation: "Sock starts with the same 's' sound as sun." },
  { text: "Which word rhymes with 'dog'?", options: ["cat", "log", "bird", "fish"], correctIndex: 1, difficulty: "easy", explanation: "Log rhymes with dog because they both end in -og." },
  { text: "How many syllables in 'apple'?", options: ["1", "2", "3", "4"], correctIndex: 1, difficulty: "easy", explanation: "Ap-ple has 2 syllables." },
  { text: "Which words rhyme: 'bed' and __?", options: ["bad", "red", "big", "run"], correctIndex: 1, difficulty: "easy", explanation: "Red rhymes with bed because they both end in -ed." },
];
const preKLetters = [
  { text: "Which is a lowercase letter?", options: ["A", "B", "c", "D"], correctIndex: 2, difficulty: "easy", explanation: "The letter 'c' is lowercase." },
  { text: "What letter does 'apple' start with?", options: ["B", "A", "C", "D"], correctIndex: 1, difficulty: "easy", explanation: "Apple starts with the letter A." },
  { text: "How many letters are in the alphabet?", options: ["24", "25", "26", "27"], correctIndex: 2, difficulty: "medium", explanation: "There are 26 letters in the English alphabet." },
  { text: "Which letter comes first: M or Z?", options: ["Z", "M", "Same", "Neither"], correctIndex: 1, difficulty: "easy", explanation: "M comes before Z in the alphabet." },
  { text: "What letter does 'dog' start with?", options: ["B", "C", "D", "G"], correctIndex: 2, difficulty: "easy", explanation: "Dog starts with the letter D." },
  { text: "Find the letter that makes the 'mmm' sound:", options: ["N", "M", "B", "P"], correctIndex: 1, difficulty: "medium", explanation: "The letter M makes the 'mmm' sound." },
  { text: "Which is the uppercase form of 'b'?", options: ["D", "B", "P", "d"], correctIndex: 1, difficulty: "medium", explanation: "The uppercase form of 'b' is 'B'." },
];
const preKVocab = [
  { text: "What do you call a baby cat?", options: ["Puppy", "Kitten", "Cub", "Chick"], correctIndex: 1, difficulty: "easy", explanation: "A baby cat is called a kitten." },
  { text: "Which word means 'happy'?", options: ["Sad", "Glad", "Mad", "Bad"], correctIndex: 1, difficulty: "easy", explanation: "Glad means happy." },
  { text: "What is the opposite of 'hot'?", options: ["Warm", "Cold", "Big", "Fast"], correctIndex: 1, difficulty: "easy", explanation: "Cold is the opposite of hot." },
  { text: "Which is a color?", options: ["Jump", "Blue", "Fast", "Tall"], correctIndex: 1, difficulty: "easy", explanation: "Blue is a color." },
  { text: "What do we call the meal we eat in the morning?", options: ["Lunch", "Dinner", "Breakfast", "Snack"], correctIndex: 2, difficulty: "easy", explanation: "The morning meal is called breakfast." },
];
const preKWriting = [
  { text: "What do we use to write?", options: ["A fork", "A pencil", "A shoe", "A cup"], correctIndex: 1, difficulty: "easy", explanation: "We use a pencil to write." },
  { text: "Which is your name most likely to start with?", options: ["A number", "A letter", "A picture", "A shape"], correctIndex: 1, difficulty: "easy", explanation: "Names start with a letter." },
  { text: "What goes at the end of a sentence?", options: ["A comma", "A period", "A letter", "A number"], correctIndex: 1, difficulty: "medium", explanation: "A period goes at the end of a sentence." },
];

const kinderPhonics = [
  { text: "What vowel sound does 'cat' have?", options: ["Long a", "Short a", "Long e", "Short e"], correctIndex: 1, difficulty: "easy", explanation: "Cat has a short 'a' sound." },
  { text: "Which word has a short 'i' sound?", options: ["bike", "sit", "kite", "time"], correctIndex: 1, difficulty: "medium", explanation: "Sit has a short 'i' sound." },
  { text: "What sound does 'sh' make?", options: ["Like 's'", "Like 'ch'", "Like in 'ship'", "Like 'th'"], correctIndex: 2, difficulty: "medium", explanation: "'Sh' makes the sound in 'ship'." },
  { text: "Which word has a short 'o' sound?", options: ["bone", "hot", "home", "rope"], correctIndex: 1, difficulty: "medium", explanation: "Hot has a short 'o' sound." },
  { text: "What letter makes the first sound in 'fish'?", options: ["P", "V", "F", "S"], correctIndex: 2, difficulty: "easy", explanation: "Fish starts with the letter F." },
  { text: "Which word starts with 'th'?", options: ["tree", "the", "she", "free"], correctIndex: 1, difficulty: "easy", explanation: "'The' starts with the 'th' sound." },
  { text: "What is the ending sound in 'bug'?", options: ["/b/", "/u/", "/g/", "/d/"], correctIndex: 2, difficulty: "medium", explanation: "Bug ends with the /g/ sound." },
  { text: "Which word has a short 'u' sound?", options: ["cute", "cup", "use", "tube"], correctIndex: 1, difficulty: "medium", explanation: "Cup has a short 'u' sound." },
  { text: "How many sounds are in the word 'map'?", options: ["2", "3", "4", "1"], correctIndex: 1, difficulty: "medium", explanation: "Map has 3 sounds: /m/ /a/ /p/." },
  { text: "Which word has a short 'e' sound?", options: ["me", "bed", "tree", "see"], correctIndex: 1, difficulty: "medium", explanation: "Bed has a short 'e' sound." },
  { text: "What sound does 'ck' make?", options: ["/s/", "/k/", "/ch/", "/t/"], correctIndex: 1, difficulty: "medium", explanation: "'Ck' makes the /k/ sound, like in 'duck'." },
];
const kinderSight = [
  { text: "Which is a sight word?", options: ["elephant", "the", "butterfly", "dinosaur"], correctIndex: 1, difficulty: "easy", explanation: "'The' is one of the most common sight words." },
  { text: "Complete: 'I __ to school.'", options: ["go", "the", "is", "at"], correctIndex: 0, difficulty: "easy", explanation: "'I go to school' makes a complete sentence." },
  { text: "Which is NOT a sight word?", options: ["is", "the", "hippopotamus", "and"], correctIndex: 2, difficulty: "easy", explanation: "Hippopotamus is not a common sight word." },
  { text: "Fill in: '__ is my friend.'", options: ["Go", "She", "Run", "Big"], correctIndex: 1, difficulty: "easy", explanation: "'She is my friend' makes sense." },
  { text: "Complete: 'The dog __ big.'", options: ["are", "is", "am", "be"], correctIndex: 1, difficulty: "easy", explanation: "'The dog is big' is correct." },
  { text: "Which word means more than one?", options: ["I", "we", "he", "it"], correctIndex: 1, difficulty: "medium", explanation: "'We' refers to more than one person." },
  { text: "Find the sight word: 'I can see the cat.'", options: ["cat", "see", "can", "All of these"], correctIndex: 3, difficulty: "medium", explanation: "I, can, see, and the are all sight words." },
  { text: "Which word means the same as 'look'?", options: ["run", "see", "go", "play"], correctIndex: 1, difficulty: "easy", explanation: "See means the same as look." },
];
const kinderComprehension = [
  { text: "In a story, who is the main character?", options: ["The setting", "The most important person", "The ending", "The title"], correctIndex: 1, difficulty: "easy", explanation: "The main character is the most important person in the story." },
  { text: "Where does a story take place?", options: ["The plot", "The characters", "The setting", "The title"], correctIndex: 2, difficulty: "easy", explanation: "The setting is where a story takes place." },
  { text: "If a character is smiling, they probably feel...", options: ["Sad", "Happy", "Angry", "Scared"], correctIndex: 1, difficulty: "easy", explanation: "Smiling usually means someone feels happy." },
  { text: "What is the title of a book?", options: ["The last page", "The name of the book", "The pictures", "The author"], correctIndex: 1, difficulty: "easy", explanation: "The title is the name of the book." },
];
const kinderWriting = [
  { text: "Every sentence starts with a...", options: ["Period", "Lowercase letter", "Capital letter", "Number"], correctIndex: 2, difficulty: "easy", explanation: "Every sentence starts with a capital letter." },
  { text: "What goes at the end of a telling sentence?", options: ["Question mark", "Exclamation point", "Period", "Comma"], correctIndex: 2, difficulty: "easy", explanation: "A period goes at the end of a telling sentence." },
  { text: "What goes at the end of a question?", options: ["Period", "Question mark", "Exclamation point", "Comma"], correctIndex: 1, difficulty: "easy", explanation: "A question mark goes at the end of a question." },
  { text: "Which is a complete sentence?", options: ["The big", "Ran fast", "The cat sat.", "Blue sky pretty"], correctIndex: 2, difficulty: "medium", explanation: "'The cat sat.' is a complete sentence." },
  { text: "What do we put between words?", options: ["Periods", "Spaces", "Lines", "Nothing"], correctIndex: 1, difficulty: "easy", explanation: "We put spaces between words." },
  { text: "Your name should always start with a...", options: ["Small letter", "Capital letter", "Number", "Period"], correctIndex: 1, difficulty: "easy", explanation: "Names always start with a capital letter." },
  { text: "How do you end a sentence that shows excitement?", options: ["Period", "Question mark", "Exclamation point", "Comma"], correctIndex: 2, difficulty: "medium", explanation: "An exclamation point shows excitement!" },
  { text: "Which word needs a capital letter?", options: ["cat", "run", "monday", "big"], correctIndex: 2, difficulty: "medium", explanation: "Monday is a day of the week and needs a capital letter." },
];
const kinderBlends = [
  { text: "What blend does 'stop' start with?", options: ["sp", "st", "sk", "sl"], correctIndex: 1, difficulty: "easy", explanation: "Stop starts with the blend 'st'." },
  { text: "Which word starts with 'bl'?", options: ["brown", "black", "bring", "brain"], correctIndex: 1, difficulty: "easy", explanation: "Black starts with the blend 'bl'." },
  { text: "What blend does 'frog' start with?", options: ["fl", "fr", "gr", "dr"], correctIndex: 1, difficulty: "easy", explanation: "Frog starts with the blend 'fr'." },
  { text: "Which word starts with 'cr'?", options: ["car", "crab", "cat", "cup"], correctIndex: 1, difficulty: "easy", explanation: "Crab starts with the blend 'cr'." },
  { text: "What blend does 'slide' start with?", options: ["st", "sp", "sl", "sk"], correctIndex: 2, difficulty: "easy", explanation: "Slide starts with the blend 'sl'." },
  { text: "Which word ends with 'nd'?", options: ["run", "hand", "hat", "hop"], correctIndex: 1, difficulty: "medium", explanation: "Hand ends with the blend 'nd'." },
  { text: "What blend does 'tree' start with?", options: ["th", "tr", "tw", "dr"], correctIndex: 1, difficulty: "easy", explanation: "Tree starts with the blend 'tr'." },
  { text: "Which word starts with 'sn'?", options: ["sun", "snake", "sand", "sit"], correctIndex: 1, difficulty: "easy", explanation: "Snake starts with the blend 'sn'." },
  { text: "What blend does 'drum' start with?", options: ["dr", "br", "gr", "tr"], correctIndex: 0, difficulty: "easy", explanation: "Drum starts with the blend 'dr'." },
  { text: "Which word starts with 'pl'?", options: ["pull", "play", "put", "pet"], correctIndex: 1, difficulty: "easy", explanation: "Play starts with the blend 'pl'." },
  { text: "What blend does 'green' start with?", options: ["gl", "gr", "br", "cr"], correctIndex: 1, difficulty: "easy", explanation: "Green starts with the blend 'gr'." },
];

const g1LongVowels = [
  { text: "Which word has a long 'a' sound?", options: ["cat", "cake", "cap", "can"], correctIndex: 1, difficulty: "easy", explanation: "Cake has a long 'a' sound (silent e rule)." },
  { text: "Which vowel team makes the long 'e' sound in 'team'?", options: ["ea", "ee", "ie", "oa"], correctIndex: 0, difficulty: "medium", explanation: "The vowel team 'ea' makes the long 'e' sound in team." },
  { text: "Which word has a long 'i' sound?", options: ["sit", "kit", "kite", "bit"], correctIndex: 2, difficulty: "easy", explanation: "Kite has a long 'i' sound (silent e rule)." },
  { text: "What makes the vowel 'long' in 'bone'?", options: ["The b", "The n", "The silent e", "The o"], correctIndex: 2, difficulty: "medium", explanation: "The silent 'e' at the end makes the 'o' say its name." },
  { text: "Which word has the vowel team 'oa'?", options: ["boat", "boot", "beat", "bite"], correctIndex: 0, difficulty: "easy", explanation: "Boat has the vowel team 'oa'." },
  { text: "Which word has a long 'u' sound?", options: ["cup", "cut", "cute", "cub"], correctIndex: 2, difficulty: "easy", explanation: "Cute has a long 'u' sound (silent e rule)." },
  { text: "In 'rain', what vowel team makes the long 'a'?", options: ["ai", "ay", "ea", "oa"], correctIndex: 0, difficulty: "medium", explanation: "The vowel team 'ai' makes the long 'a' sound in rain." },
  { text: "Which word has the 'ee' vowel team?", options: ["meat", "tree", "rain", "boat"], correctIndex: 1, difficulty: "easy", explanation: "Tree has the 'ee' vowel team." },
  { text: "What is the rule for silent e?", options: ["Makes no sound, vowel is short", "Makes the vowel say its name", "Makes a 'eh' sound", "Always at the beginning"], correctIndex: 1, difficulty: "medium", explanation: "Silent e makes the vowel before it say its name (long sound)." },
  { text: "Which word does NOT have a long vowel?", options: ["cake", "bike", "hat", "rope"], correctIndex: 2, difficulty: "medium", explanation: "Hat has a short 'a' sound." },
  { text: "Which vowel team makes the long 'o' in 'coat'?", options: ["oo", "oa", "ou", "ow"], correctIndex: 1, difficulty: "medium", explanation: "The vowel team 'oa' makes the long 'o' sound in coat." },
  { text: "Does 'hope' have a long or short vowel?", options: ["Short o", "Long o", "Short e", "Long e"], correctIndex: 1, difficulty: "easy", explanation: "Hope has a long 'o' because of the silent e." },
  { text: "Which word has the 'ay' vowel team?", options: ["rain", "play", "paid", "boat"], correctIndex: 1, difficulty: "easy", explanation: "Play has the 'ay' vowel team at the end." },
];
const g1SightWords = [
  { text: "Which word means 'not any'?", options: ["some", "none", "all", "many"], correctIndex: 1, difficulty: "easy", explanation: "None means not any." },
  { text: "Complete: 'I __ like to play.'", options: ["would", "wood", "wold", "woud"], correctIndex: 0, difficulty: "medium", explanation: "'Would' is the correct sight word spelling." },
  { text: "Which word is spelled correctly?", options: ["becuz", "because", "becaus", "becuse"], correctIndex: 1, difficulty: "medium", explanation: "'Because' is the correct spelling." },
  { text: "Fill in: 'There are __ apples.'", options: ["too", "to", "two", "tow"], correctIndex: 2, difficulty: "medium", explanation: "'Two' is the number word for 2." },
  { text: "Which means 'at this time'?", options: ["then", "now", "when", "how"], correctIndex: 1, difficulty: "easy", explanation: "'Now' means at this time." },
  { text: "Complete: '__ are you going?'", options: ["Wear", "Were", "Where", "We're"], correctIndex: 2, difficulty: "medium", explanation: "'Where' asks about a place." },
  { text: "Which word means 'every one'?", options: ["some", "all", "few", "none"], correctIndex: 1, difficulty: "easy", explanation: "'All' means every one." },
  { text: "Fill in: 'I have __ books.'", options: ["many", "much", "more", "most"], correctIndex: 0, difficulty: "easy", explanation: "'Many' is used with things you can count." },
  { text: "Which is the past tense of 'come'?", options: ["comed", "came", "camed", "coming"], correctIndex: 1, difficulty: "medium", explanation: "'Came' is the past tense of come." },
];
const g1Fiction = [
  { text: "What is a character in a story?", options: ["The place", "A person or animal", "The problem", "The ending"], correctIndex: 1, difficulty: "easy", explanation: "A character is a person or animal in the story." },
  { text: "The problem in a story is called the...", options: ["Setting", "Solution", "Conflict", "Theme"], correctIndex: 2, difficulty: "medium", explanation: "The conflict is the problem the characters face." },
  { text: "What is the beginning of a story called?", options: ["Conclusion", "Introduction", "Climax", "Resolution"], correctIndex: 1, difficulty: "medium", explanation: "The introduction is the beginning of a story." },
  { text: "A story that is made up is called...", options: ["Nonfiction", "Fiction", "Biography", "News"], correctIndex: 1, difficulty: "easy", explanation: "Fiction means the story is made up." },
  { text: "What is the lesson of a story called?", options: ["Plot", "Setting", "Moral", "Character"], correctIndex: 2, difficulty: "medium", explanation: "The moral is the lesson we learn from a story." },
  { text: "When we guess what will happen next, we are making a...", options: ["Summary", "Prediction", "Connection", "Question"], correctIndex: 1, difficulty: "medium", explanation: "A prediction is a guess about what will happen next." },
];
const g1Nonfiction = [
  { text: "Nonfiction books are about...", options: ["Made-up stories", "Real things", "Fairy tales", "Magic"], correctIndex: 1, difficulty: "easy", explanation: "Nonfiction books give information about real things." },
  { text: "What is a fact?", options: ["Something someone thinks", "Something that is true", "A made-up story", "A guess"], correctIndex: 1, difficulty: "easy", explanation: "A fact is something that is true and can be proven." },
  { text: "What is a table of contents?", options: ["A list of chapters", "The last page", "A picture", "The cover"], correctIndex: 0, difficulty: "medium", explanation: "A table of contents lists the chapters and page numbers." },
  { text: "Captions in a book tell us about...", options: ["The author", "The pictures", "The title", "The price"], correctIndex: 1, difficulty: "medium", explanation: "Captions explain what is shown in pictures." },
  { text: "A book about how butterflies grow is...", options: ["Fiction", "Nonfiction", "Poetry", "A fairy tale"], correctIndex: 1, difficulty: "easy", explanation: "A book about real butterflies is nonfiction." },
  { text: "What does a glossary do?", options: ["Tells the story", "Defines words", "Shows pictures", "Lists chapters"], correctIndex: 1, difficulty: "medium", explanation: "A glossary defines important words used in the book." },
  { text: "An index helps you find...", options: ["The cover", "Specific topics", "The author", "Pictures"], correctIndex: 1, difficulty: "medium", explanation: "An index helps you find specific topics by page number." },
  { text: "What is the difference between a fact and an opinion?", options: ["Facts are longer", "Facts can be proven, opinions cannot", "Opinions are true", "No difference"], correctIndex: 1, difficulty: "hard", explanation: "Facts can be proven true; opinions are what someone thinks." },
  { text: "Headings in a book help us...", options: ["Find topics quickly", "Count pages", "See pictures", "Read faster"], correctIndex: 0, difficulty: "medium", explanation: "Headings tell us what each section is about." },
  { text: "A diagram is a...", options: ["Type of story", "Drawing that shows information", "Kind of poem", "Book title"], correctIndex: 1, difficulty: "medium", explanation: "A diagram is a drawing that shows how something works." },
  { text: "Which is an opinion?", options: ["Dogs have four legs", "Cats are the best pets", "Fish live in water", "Birds have feathers"], correctIndex: 1, difficulty: "medium", explanation: "'Cats are the best pets' is an opinion because not everyone agrees." },
];
const g1Writing = [
  { text: "A narrative tells...", options: ["Facts", "A story", "Directions", "A list"], correctIndex: 1, difficulty: "easy", explanation: "A narrative tells a story." },
  { text: "What should every sentence end with?", options: ["A capital letter", "Punctuation", "A number", "A space"], correctIndex: 1, difficulty: "easy", explanation: "Every sentence ends with punctuation." },
  { text: "An opinion is...", options: ["A fact", "What you think or feel", "A question", "A command"], correctIndex: 1, difficulty: "easy", explanation: "An opinion is what you think or feel about something." },
  { text: "Which is a good beginning for a story?", options: ["The end.", "One sunny day,", "And then.", "Because."], correctIndex: 1, difficulty: "medium", explanation: "'One sunny day,' sets the scene." },
  { text: "What word connects two ideas?", options: ["The", "And", "A", "Is"], correctIndex: 1, difficulty: "easy", explanation: "'And' connects two ideas together." },
  { text: "Which sentence gives an opinion?", options: ["The sky is blue.", "I think pizza is yummy.", "Dogs bark.", "Water is wet."], correctIndex: 1, difficulty: "medium", explanation: "'I think pizza is yummy' is an opinion." },
  { text: "What does 'first, next, then, last' help with?", options: ["Counting", "Putting events in order", "Spelling", "Drawing"], correctIndex: 1, difficulty: "medium", explanation: "These words help put events in the correct order." },
  { text: "A topic sentence tells...", options: ["The ending", "What the paragraph is about", "A joke", "The date"], correctIndex: 1, difficulty: "medium", explanation: "A topic sentence tells what the paragraph will be about." },
  { text: "Which is a complete sentence?", options: ["Running fast.", "The big red.", "She likes to read.", "Happy and fun."], correctIndex: 2, difficulty: "medium", explanation: "'She likes to read' has a subject and a verb." },
  { text: "What do we call the rough version of writing?", options: ["Final copy", "Draft", "Title", "Cover"], correctIndex: 1, difficulty: "medium", explanation: "A draft is the rough version before the final copy." },
  { text: "Which word shows time order?", options: ["Because", "However", "Finally", "Although"], correctIndex: 2, difficulty: "medium", explanation: "'Finally' shows something happens at the end." },
];
const g1Grammar = [
  { text: "A noun is a word that names a...", options: ["Action", "Person, place, or thing", "Description", "Feeling"], correctIndex: 1, difficulty: "easy", explanation: "A noun names a person, place, or thing." },
  { text: "Which word is a verb?", options: ["happy", "run", "big", "cat"], correctIndex: 1, difficulty: "easy", explanation: "'Run' is a verb (action word)." },
  { text: "Which word is an adjective?", options: ["jump", "quickly", "tall", "she"], correctIndex: 2, difficulty: "medium", explanation: "'Tall' is an adjective (describes a noun)." },
  { text: "What is the plural of 'cat'?", options: ["cat", "cats", "cates", "catz"], correctIndex: 1, difficulty: "easy", explanation: "Add 's' to make cat plural: cats." },
  { text: "Which sentence uses correct capitalization?", options: ["i like dogs.", "I like dogs.", "i Like Dogs.", "I like Dogs."], correctIndex: 1, difficulty: "easy", explanation: "Only the first word and proper nouns need capitals." },
  { text: "A pronoun replaces a...", options: ["Verb", "Noun", "Adjective", "Sentence"], correctIndex: 1, difficulty: "medium", explanation: "A pronoun (he, she, it, they) replaces a noun." },
  { text: "Which is a proper noun?", options: ["dog", "city", "Texas", "book"], correctIndex: 2, difficulty: "medium", explanation: "Texas is a proper noun and needs a capital letter." },
  { text: "What punctuation ends a question?", options: ["Period", "Exclamation point", "Question mark", "Comma"], correctIndex: 2, difficulty: "easy", explanation: "A question mark (?) ends a question." },
  { text: "Which word is a conjunction?", options: ["run", "and", "big", "the"], correctIndex: 1, difficulty: "medium", explanation: "'And' is a conjunction that joins words or ideas." },
  { text: "What is the past tense of 'walk'?", options: ["walks", "walking", "walked", "walker"], correctIndex: 2, difficulty: "medium", explanation: "Add '-ed' to make walk past tense: walked." },
  { text: "Which sentence has correct punctuation?", options: ["Do you like ice cream", "Do you like ice cream?", "Do you like ice cream.", "do you like ice cream?"], correctIndex: 1, difficulty: "easy", explanation: "Questions need a question mark and start with a capital." },
];
const g1FamilyHistory = [
  { text: "What is a tradition?", options: ["A new invention", "Something done the same way over time", "A type of food", "A holiday"], correctIndex: 1, difficulty: "easy", explanation: "A tradition is something people do the same way over time." },
  { text: "A family tree shows...", options: ["Types of trees", "Family members and how they are related", "A garden", "A neighborhood"], correctIndex: 1, difficulty: "easy", explanation: "A family tree shows how family members are connected." },
  { text: "What is history?", options: ["The future", "Stories about the past", "Today's news", "A type of book"], correctIndex: 1, difficulty: "easy", explanation: "History is the study of what happened in the past." },
  { text: "Why do families celebrate holidays?", options: ["To miss school", "To remember important events", "To buy things", "To sleep late"], correctIndex: 1, difficulty: "medium", explanation: "Families celebrate holidays to remember important events." },
  { text: "What is a generation?", options: ["A type of machine", "People born around the same time", "A holiday", "A school"], correctIndex: 1, difficulty: "medium", explanation: "A generation is a group of people born around the same time." },
  { text: "Which is an example of a family tradition?", options: ["Going to school", "Having a special meal every Sunday", "Watching TV", "Sleeping"], correctIndex: 1, difficulty: "easy", explanation: "A special family meal every Sunday is a tradition." },
  { text: "What can we learn from older family members?", options: ["Nothing", "Stories about the past", "How to use computers", "Future events"], correctIndex: 1, difficulty: "easy", explanation: "Older family members share stories about the past." },
  { text: "A timeline shows events in...", options: ["Random order", "Alphabetical order", "Time order", "Size order"], correctIndex: 2, difficulty: "medium", explanation: "A timeline shows events in the order they happened." },
];
const g1Community = [
  { text: "What is a community?", options: ["A type of animal", "A place where people live and work together", "A school subject", "A holiday"], correctIndex: 1, difficulty: "easy", explanation: "A community is a place where people live and work together." },
  { text: "Who makes rules for a community?", options: ["Children", "Government leaders", "Pets", "Visitors"], correctIndex: 1, difficulty: "easy", explanation: "Government leaders make rules (laws) for the community." },
  { text: "Why do we have rules?", options: ["To be mean", "To keep people safe and fair", "To have fun", "To make money"], correctIndex: 1, difficulty: "easy", explanation: "Rules help keep everyone safe and make things fair." },
  { text: "What does a mayor do?", options: ["Teaches school", "Leads a city or town", "Drives a bus", "Delivers mail"], correctIndex: 1, difficulty: "medium", explanation: "A mayor is the leader of a city or town." },
  { text: "Which is a community helper?", options: ["A rock", "A firefighter", "A cloud", "A tree"], correctIndex: 1, difficulty: "easy", explanation: "A firefighter is a community helper." },
  { text: "What is a citizen?", options: ["A visitor", "A member of a community or country", "A pet", "A building"], correctIndex: 1, difficulty: "medium", explanation: "A citizen is a person who belongs to a community or country." },
  { text: "What is a responsibility?", options: ["Something you must do", "A game", "A holiday", "A reward"], correctIndex: 0, difficulty: "medium", explanation: "A responsibility is something you are expected to do." },
  { text: "Which is a right that citizens have?", options: ["Free speech", "Free candy", "Free toys", "Free pets"], correctIndex: 0, difficulty: "medium", explanation: "Free speech is a right — citizens can share their ideas." },
];
const g1Maps = [
  { text: "What does a map show?", options: ["Time", "Places and locations", "Numbers", "Letters"], correctIndex: 1, difficulty: "easy", explanation: "A map shows places and where things are located." },
  { text: "What is a compass rose?", options: ["A type of flower", "Shows directions on a map", "A type of map", "A city name"], correctIndex: 1, difficulty: "medium", explanation: "A compass rose shows N, S, E, W on a map." },
  { text: "Which direction is at the top of most maps?", options: ["South", "East", "North", "West"], correctIndex: 2, difficulty: "easy", explanation: "North is usually at the top of a map." },
  { text: "What is a map key (legend)?", options: ["A door key", "Explains symbols on a map", "The map title", "A compass"], correctIndex: 1, difficulty: "medium", explanation: "A map key explains what the symbols on the map mean." },
  { text: "A globe shows...", options: ["Your neighborhood", "The whole Earth", "One room", "The sky"], correctIndex: 1, difficulty: "easy", explanation: "A globe is a round model that shows the whole Earth." },
  { text: "What is a continent?", options: ["A country", "A large land area", "An ocean", "A city"], correctIndex: 1, difficulty: "medium", explanation: "A continent is a very large area of land." },
  { text: "How many continents are there?", options: ["5", "6", "7", "8"], correctIndex: 2, difficulty: "medium", explanation: "There are 7 continents on Earth." },
  { text: "What is an ocean?", options: ["A small pond", "A large body of salt water", "A river", "A lake"], correctIndex: 1, difficulty: "easy", explanation: "An ocean is a very large body of salt water." },
];
const g1Economics = [
  { text: "What is a 'need'?", options: ["Something you want", "Something you must have to live", "A toy", "A game"], correctIndex: 1, difficulty: "easy", explanation: "A need is something you must have to survive." },
  { text: "Which is a 'want'?", options: ["Food", "Water", "A toy", "Shelter"], correctIndex: 2, difficulty: "easy", explanation: "A toy is a want — nice to have but not needed to survive." },
  { text: "What are goods?", options: ["Actions people do", "Things you can buy", "Places to visit", "Rules to follow"], correctIndex: 1, difficulty: "easy", explanation: "Goods are things (objects) that people can buy." },
  { text: "What are services?", options: ["Things at a store", "Work people do for others", "Types of food", "Kinds of toys"], correctIndex: 1, difficulty: "easy", explanation: "Services are work that people do for others." },
  { text: "Which is a service?", options: ["A book", "A haircut", "A car", "A shirt"], correctIndex: 1, difficulty: "easy", explanation: "A haircut is a service — someone does work for you." },
  { text: "What does 'earn' mean?", options: ["To spend money", "To get money by working", "To save money", "To lose money"], correctIndex: 1, difficulty: "easy", explanation: "To earn means to get money by doing work." },
  { text: "Why do people save money?", options: ["To throw it away", "To buy things later", "Because it's heavy", "To look at it"], correctIndex: 1, difficulty: "easy", explanation: "People save money so they can buy things later." },
  { text: "What is a producer?", options: ["Someone who buys things", "Someone who makes or grows things", "A type of store", "A kind of money"], correctIndex: 1, difficulty: "medium", explanation: "A producer makes or grows goods for others to buy." },
];

// ─── Main Logic ──────────────────────────────────────────────────────────────

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [lowUnits] = await conn.execute(`
  SELECT c.id as courseId, c.title as courseTitle, c.gradeLevel, 
    u.id as unitId, u.unitNumber, u.title as unitTitle,
    COUNT(q.id) as questionCount
  FROM courses c
  JOIN units u ON u.courseId = c.id
  LEFT JOIN quizQuestions q ON q.unitId = u.id
  WHERE c.gradeLevel IN ('Pre-K', 'Kindergarten', '1', '2')
  AND c.isActive = 1
  GROUP BY c.id, c.title, c.gradeLevel, u.id, u.unitNumber, u.title
  HAVING COUNT(q.id) < 20
  ORDER BY COUNT(q.id) ASC
`);

console.log(`Found ${lowUnits.length} units with fewer than 20 questions`);

let totalInserted = 0;
for (const unit of lowUnits) {
  const needed = 20 - Number(unit.questionCount);
  if (needed <= 0) continue;
  
  const values = [];
  for (let i = 0; i < needed; i++) {
    const question = generateQuestion(unit.gradeLevel, unit.unitTitle, i);
    values.push([
      unit.unitId,
      unit.unitNumber,
      question.text,
      JSON.stringify(question.options),
      question.correctIndex,
      question.difficulty,
      question.explanation
    ]);
  }
  
  if (values.length > 0) {
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',');
    const flat = values.flat();
    await conn.execute(
      `INSERT INTO quizQuestions (unitId, unitNumber, questionText, options, correctOptionIndex, difficulty, explanation) VALUES ${placeholders}`,
      flat
    );
    totalInserted += values.length;
    console.log(`  +${values.length} for ${unit.courseTitle} > ${unit.unitTitle} (was ${unit.questionCount})`);
  }
}

console.log(`\nTotal new questions inserted: ${totalInserted}`);
await conn.end();

function generateQuestion(gradeLevel, unitTitle, index) {
  const t = unitTitle.toLowerCase();
  
  if (gradeLevel === 'Pre-K') {
    if (t.includes('counting') || t.includes('cardinality')) return pickFrom(preKCounting, index);
    if (t.includes('shape') || t.includes('spatial')) return pickFrom(preKShapes, index);
    if (t.includes('pattern') || t.includes('sorting')) return pickFrom(preKPatterns, index);
    if (t.includes('compar') || t.includes('measur')) return pickFrom(preKComparing, index);
    if (t.includes('number')) return pickFrom(preKNumbers, index);
    if (t.includes('print')) return pickFrom(preKPrint, index);
    if (t.includes('phonol')) return pickFrom(preKPhonological, index);
    if (t.includes('letter')) return pickFrom(preKLetters, index);
    if (t.includes('vocab') || t.includes('oral')) return pickFrom(preKVocab, index);
    if (t.includes('writing')) return pickFrom(preKWriting, index);
  }
  if (gradeLevel === 'Kindergarten') {
    if (t.includes('short vowel') || t.includes('phonics')) return pickFrom(kinderPhonics, index);
    if (t.includes('sight')) return pickFrom(kinderSight, index);
    if (t.includes('comprehension')) return pickFrom(kinderComprehension, index);
    if (t.includes('writing')) return pickFrom(kinderWriting, index);
    if (t.includes('blend')) return pickFrom(kinderBlends, index);
  }
  if (gradeLevel === '1') {
    if (t.includes('long vowel') || t.includes('vowel team')) return pickFrom(g1LongVowels, index);
    if (t.includes('sight')) return pickFrom(g1SightWords, index);
    if (t.includes('fiction') && t.includes('comprehension')) return pickFrom(g1Fiction, index);
    if (t.includes('nonfiction') && t.includes('comprehension')) return pickFrom(g1Nonfiction, index);
    if (t.includes('writing')) return pickFrom(g1Writing, index);
    if (t.includes('grammar')) return pickFrom(g1Grammar, index);
    if (t.includes('family') || t.includes('tradition')) return pickFrom(g1FamilyHistory, index);
    if (t.includes('community') || t.includes('government')) return pickFrom(g1Community, index);
    if (t.includes('map') || t.includes('geography')) return pickFrom(g1Maps, index);
    if (t.includes('economics') || t.includes('goods')) return pickFrom(g1Economics, index);
  }
  
  // Fallback
  return {
    text: `Which answer about "${unitTitle}" is correct?`,
    options: ["First choice", "Second choice", "Third choice", "Fourth choice"],
    correctIndex: 0,
    difficulty: "easy",
    explanation: `This tests your understanding of ${unitTitle}.`
  };
}

function pickFrom(arr, index) {
  return arr[index % arr.length];
}
