// questions.js
//
// This is the ONE file you need to edit to change the check-in questions.
// Each question has:
//   - id: a unique key (don't change this once you've saved real answers)
//   - title: the question shown to the user
//   - options: the list of buttons for that question
//
// Each option has:
//   - emoji: shown big on the button
//   - label: the text shown on the button, and the value that gets saved

export const questions = [
  {
    id: "whatHappened",
    title: "What happened?",
    options: [
      { emoji: "😡", label: "Someone made me angry" },
      { emoji: "😔", label: "Someone hurt my feelings" },
      { emoji: "😤", label: "I had an argument" },
      { emoji: "😞", label: "Something didn't go the way I wanted" },
      { emoji: "😩", label: "I'm stressed or overwhelmed" },
      { emoji: "💔", label: "Someone disappointed me" },
      { emoji: "🥺", label: "I feel ignored" },
      { emoji: "😶", label: "I don't really know" },
      { emoji: "🙄", label: "I don't want to be asked right now" },
      { emoji: "😤", label: "I'm sick of this happening again" },
    ],
  },
  {
    id: "angerLevel",
    title: "How angry are you?",
    options: [
      { emoji: "🙂", label: "A little" },
      { emoji: "😐", label: "Somewhat" },
      { emoji: "😠", label: "Quite angry" },
      { emoji: "😡", label: "Very angry" },
      { emoji: "🤬", label: "Extremely angry" },
    ],
  },
  {
    id: "whatWants",
    title: "What do you want right now?",
    options: [
      { emoji: "👂", label: "I want someone to listen" },
      { emoji: "💬", label: "I want to talk about it" },
      { emoji: "🤫", label: "I want some space" },
      { emoji: "😌", label: "I want to calm down" },
      { emoji: "🤷", label: "I don't know" },
    ],
  },
];
