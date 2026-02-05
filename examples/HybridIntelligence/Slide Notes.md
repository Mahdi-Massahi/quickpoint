This session is about "Hybrid Intelligence". 
I won't share any rules of thumb, tips or tricks. My goal in this talk is to share my mindset with you. And unfortunately to get there we need to go through some theories, I've done my best to make the theory engaging! Once we all get there and make sure we are on the same page, I will give you a few examples to show you how one can materialise (?) what we'll talk about.

During the session you'll see the stack under the slide title, follow it to not to get lost!

Don't worry if you missed the flow, it might be a bit "complex"; however I will share the slides on my LinkedIn :)


Well as I said, this talk is about Hybrid Intelligence. To understand what it is, we first need to break it down and understand the pieces; Hybrid and Intelligence. Let's start with Intelligence.

---
# What is "Intelligence"? 
Hybrid Intelligence > Intelligence

Before talking about "Hybrid" intelligence, first let's take a look at the definition of "Intelligence".
What is Intelligence? There are many different definitions of Intelligence. 

> **The ability to solve problems, or to create products, that are valued within one or more cultural settings.**
> - **Howard Gardner** -- Psychologist
> ![[Pasted image 20260131184148.png]]

> **"Intelligence is the ability to solve problems."** (He also famously added: "...but wisdom is the ability to prevent them.")
> - **Herbert Simon** -- Computer Science Researcher
> ![[Pasted image 20260131184250.png]]

It seems that intelligence is closely tied to "problem solving". 

---
# What is a "Problem"?
Hybrid Intelligence > Intelligence > Problem 

Ok now let's take a look at the definition of "problem" in the field of computer science.

> **"A problem is a general <u>**question**</u><u> to be answered</u>, usually possessing several parameters, or free variables, whose values are left unspecified."**
> 
> - Michael R. Garey and David S. Johnson
>   Computers and Intractability: A Guide to the Theory of NP-Completeness

Before we dig into the types of problems, let's make one thing clear here.
"Issue" and "problem" are not the same!

Definition of Issue:
> A real-world difficulty that is often ambiguous, has no clear input/output, and involves human factors.

In formal Computer Science, we rarely use the word "Issue" as a technical term. "Issue" is usually language for Software Engineering (e.g., "Jira Issue," "Bug").

To make it more clear, let's check out an example.

---
# "Issue" vs "Problem"
Hybrid Intelligence > Intelligence > Problem 

Is the weather in the Netherlands an issue or a problem?

The "Issue"
In my home country, if it's raining, we say, 'The weather is an **issue** today.' It’s a mood. It's a vibe. It's messy. You just complain about it.

The "Problem"
In the Netherlands, you don't have 'issues' with rain. You have a **Computational Problem**!
You open the Buienradar app. You look at the data. You calculate: 'Given a wind speed of 30km/h from the West and a rainfall intensity of 2mm/hour, what is the 15-minute window where I can bike to the Central Station without getting soaked?

As an immigrant, I'm trying to see the Netherlands' weather, as a problem, not an issue!

"To resolve an issue, we convert it to a well-defined problem and try to solve it."

---
# Problem Types
Hybrid Intelligence > Intelligence > Problem 
#### The Counting Problem (The "How Many")
- **The Scenario:** Agenda Planning
- **The Problem:** "I want to have dinner with three friends. How many possible Friday nights are available between now and 2028 where all four of our agendas are not already full?"
- **The Solution:** 0. (Usually with Dutch Friends!)
#### The Optimisation Problem (The "Best")
- **The Scenario:** The Albert Heijn Bonuskaart.
- **The Problem:** "I need 5 types of cheese and 3 boxes of bitterballen. Which combination of '1+1 Gratis' deals across three different supermarkets results in the lowest possible price?"
- **The Solution:** The absolute minimum price
#### The Search Problem (The "Find One")
- **The Scenario:** Biking in Amsterdam.
- **The Problem:** "I am at the train station. There are 10,000 bikes parked here. Find **my** bike (the one with the broken bell.)"
- **The Solution:** The exact location of that one specific bike.
#### The Decision Problem (The "Yes/No")
- **The Scenario:** The NS.
- **The Problem:** "I am at Utrecht Centraal. My train leaves in 4 minutes. I want a Koffie To Go. Is there a sequence of physical movements that allows me to get the coffee and board the train?"
- **The Solution:** TRUE (You get the coffee) or FALSE (You are standing on the platform watching the train leave).
---
# Reduction
Hybrid Intelligence > Intelligence > Problem 

All problem types are somewhat connected. 
If you can solve the Decision version efficiently, you can solve the Search, Counting, and Optimization versions efficiently. In other words, if the Decision version is hard to solve, the Search version should be also hard. 
**Computer Scientists treat the Decision Problem as the universal standard**
Therefore, for the rest of this talk, we will focus on the **Decision Problem**. It is the simplest form, but it holds the key to solving them all.

---
# Algorithms
Hybrid Intelligence > Intelligence > Problem > Algorithms

Algorithms are the tools we use to solve problems. 

An **Algorithm** is a precise, step-by-step procedure to solve a problem in a finite about of time.

If a Problem is a 'destination' we want to reach, an **Algorithm** is the 'vehicle' or the 'map' we use to get there.

We can have many different vehicles to reach the same destination. Some are bicycles, some are jet planes.


- **The Problem:** Find a specific name ("Zoe") in a sorted phonebook of 1 million people.

- **Algorithm A:** Start at page 1, check every name one by one.
    - Performance: If Zoe is at the end, you take **1,000,000 steps**. (Linear Search)
        
- **Algorithm B:** Open to the middle. Is Zoe in the first half or second? Rip the phonebook in half. Repeat.
    - Performance: You find Zoe in about **20 steps** (Binary Search)

To measure the complexity of algorithms, we are usually interested in the worst case.
Clearly, 20 steps is better than 1 million. But how do we describe this difference mathematically?

---
# Complexity Orders (for algorithms)
Hybrid Intelligence > Intelligence > Problem > Algorithms > Complexity Orders

- **Algorithm A** is O(n) — The time it takes grows **linearly** with the size of the book.
- **Algorithm B** is O(log ⁡n) — The time it takes grows **logarithmically** (extremely slowly).

[complexity order chart]

~~**Time Complexity:** How many operations (steps) does the computer perform?~~
~~**Space Complexity:** How much extra "scratchpad" memory does the algorithm need to store data while it works?~~

---
# Complexity Classes  (for problems)
Hybrid Intelligence > Intelligence > Problem > Complexity Classes

We can classify the problems based on the most efficient algorithms we have to solve and verify them.

[Chomsky Hierarchy Chart] having the complexity orders inside it.
and also the space of Ill-posed (on the left size) and well-posed problems (on the right side)
and an animation that brings Ill-posed problems and makes it well defined and puts it into the well-posed problems in its complexity class.

Let's take a look at some examples

---
# Problem Classification
Hybrid Intelligence > Intelligence > Problem > Complexity Classes

> Is X even?
- Easy to solve: check the last digit O(1) -> then its in P, we dont need to check for complexity of solver.

> What is the maximum number in this array?
- Easy to solve: O(N) -> again its in P

> Given this set of N pieces and a target frame 20x20, does there exist a valid arrangement that fits them all together perfectly?
- Hard to solve: O(N!) -> since its hard, let's check the verification complexity
- Easy to verify: O(N)
- NP

If checking a piece takes 1 second, and the puzzle has 100 pieces, in the worst case you might need $10^{157}$ seconds. For your reference universe is only $10^{17}$ seconds old!

So if you've solved a 1000 piece jigsaw puzzle, you should be proud of yourself! Should you?
Well, really not. The definition of jigsaw is quite different in computer science. No images, no patterns on the edges. 

> **Given a specific board configuration (arrangement of pieces), does White have a winning strategy?**

- Extremely hard to solve: $2^{N^{k}}$
- Extremely hard to verify: $2^{N^{k}}$
- EXPTIME

---
# Discovering more efficient algorithms
Hybrid Intelligence > Intelligence > Problem > Complexity Classes

Let's once again point out that we classify a problem in a complexity class based on the discovered efficient algorithm for solving and verifying it.

Given a positive integer N, is N a prime number?
- Easy to solve: O($n^6$) where n is the number of bits -> it's in P

The most efficient algorithm for this problem prior to 2002 was probabilistic (**BPP**), but by discovering a deterministic polynomial-time algorithm, the problem was proven to be in **P**!

So, while the problem itself strictly belongs to a specific complexity class based on its inherent difficulty, our **knowledge** of which class it belongs to can change as we discover more efficient algorithms!

---
# Choosing Algorithms for Problems
Hybrid Intelligence > Intelligence > Problem

When we implement a project, we face different problems from different classes and our goal as "developers" is to find suitable algorithms (which itself is an optimisation problem!) and implement them (at least we used to, before LLMs!). The technical success of the project is highly dependent on the algorithms we choose. 

[animation about an space of problems from different classes and some points getting highlighted within that space by the definition of project]

We don't use a **nuclear power plant to toast a piece of bread**. It works, but it is incredibly inefficient and might accidentally burn the house down. And obviously, it's also not good for the environment!

---
# The LLM hammer
Hybrid Intelligence > Intelligence > Problem

LLMs are really amazing as both input and output are flexible and can be applied to solve many problems, as we can instruct them using prompts! 

So LLMs are algorithms that we can use for solving problems, so let's check what happens if we replace LLMs with the most efficient algorithms discovered for well-posed problems.

[an animation that shows the problems from P and NP goes to BPP (check if's factually correct) using the LLM hammer]

---
# The "broken" LLM hammer
Hybrid Intelligence > Intelligence > Problem

"So, history shows us that progress looks like moving problems from **BPP** (Probabilistic) to **P** (Deterministic). We want certainty.

**But right now, we are doing the exact opposite.**

When you ask an LLM to multiply two large numbers, or to check if a number is Prime, or to sort a list, you are taking a problem that belongs in **P**—one that we have solved perfectly—and you are forcing it through a probabilistic engine.

You are effectively dragging a **P** problem back into **BPP** (or worse, into 'Undefined'). You are reintroducing uncertainty into solved domains. 

---
# From LLM hammer to LLM translator
Hybrid Intelligence > Intelligence

But there is a specific set of problems that LLMs help us to solve; being able to include the ill-posed problems which have been outside of our problem space (since we had no algorithm for them to attempt to solve them) to BPP! 

What they did was take problems that used to be **'Human-Only'** (Semantic Ambiguity) and turn them into **'Computable Problems'**

[show the graph animation we had earlier; select a random region from ill-posed problems and bring them into BPP]

Show that we have a ill-posed problem in that region, LLM breaks it down to a couple of problems and those problems land in NP, P, or even Unsolvable!

---
# The Hybrid Intelligence
Hybrid Intelligence

This is fantastic!
This means we are now able to attempt to solve problems programmatically which we were unable before LLMs. This is the true intelligence!

So;
> "We shouldn't ask LLMs to solve the problem. We should ask LLMs to translate the messy real-world **Issue** into a formal **Problem** that a classical algorithm can solve."

Meaning that from these ill-defined problems we can extract (using LLMs) some well-defined problems and offload them to get solved with the best algorithms we already have! To achieve the most optimal (efficient, accurate and deterministic) results.

This can be easily done by tool calling.
But sometimes tool calling is also not deterministic enough!

---
# From "issue" to "hybrid intelligence" - an example
Problem Definition

Complain: Oh man, I really need to learn Dutch!

Problem definition: How can I learn Dutch?
Solution: register to municipality free Dutch classes and participate classes and wait for a year and a half on the line.

Problem definition (version 37): How can I start effectively and efficiently learning Dutch with personalised and interactive lessons that has great features to do bluh bluh bluh...
Solution: No such thing exists, implement your own!

---
# From "Issue" to "Hybrid Intelligence"
Problem Definition > Algorithm Definition

Let's build a "simple" LLM based app for this, why not!

System Prompt
```
You are a very helpful language teacher called Lingua! 
You speak both English and Dutch fluently. 

Your student is called Mahdi. 
He speaks English and his Dutch level is "+ Who gaat het? - I gaat het!".
```

Tools:
```python
def save_vocab(vocab_in_nl: str, vocab_in_en: str):
	"""
	use this tool to save a the vocabulary in vector database
	"""
	...
	
def pronounce(text_in_nl: str):
	"""
	use this tool to pronounce the vocabulary or phrase in Dutch
	"""
```

---
# From "Issue" to "Hybrid Intelligence"
Problem Definition > Algorithm Definition > Diagnose Response

Results:
Some sample response from LLM based on some input text in chat view that we have a text mixed with different words both in Dutch and English and 2 `save_vocab` calls and 1 `pronounce`.

Complains: no `save_vocab` or `pronounce` calling for all new vocabs

---
# From "Issue" to "Hybrid Intelligence"
Problem Definition > Algorithm Definition > Diagnose Response > Hammer [a giant hammer icon]

New system prompt: 
```
You are a very helpful language teacher called Lingua! 
You speak both English and Dutch fluently. 

Your student is called Mahdi. 
He speaks English and his Dutch level is "+ Who gaat het? - I gaat het!".

For every Dutch vocabulary you use, make sure you make a tool call to `save_vocab` and `pronounce` for the last phrase as a follow up.
You may need to call `pronounce` tool upon user's request for specific phrases.
```

Results:
Some response form LLM to the same query, more save_vocab tool calls and pronounce but again some missing vocabs. 

---
# From "Issue" to "Hybrid Intelligence"
Problem Definition > Algorithm Definition > Diagnose Response > Hybrid Intelligence

New system prompt: 
```
You are a very helpful language teacher called Lingua! 
You speak both English and Dutch fluently. 

Your student is called Mahdi. 
He speaks English and his Dutch level is "+ Who gaat het? - I gaat het!".

You put every dutch phrase bold using markdown specific characters and immediately after each Dutch phrase you use round brackets around the English translation of that phrase or word. 

Example: The phrase **Hoe gaat het?** (How are you?) is used for greeting.
```

And then you pass the response to a deterministic algorithm and run a regex to extract all bold phrases that come before phrase within round brackets with a single space between. And then you run `save_vocab` and `pronounce` for all extracted results! And render it nicely on the UI.
A response message having Dutch phrase highlighted in purple and has a play button next to it. And when hovered you get the translation as tooltip!

---
