import type { Question } from "@/lib/types";

/**
 * 15 interview problems, in Kotlin only, organised by pattern.
 * Convention: `relatedConcepts[0]` is the pattern name — the interview
 * coding page groups by it, because recalling the pattern is the skill,
 * not recalling the problem.
 */

export const DSA_QUESTIONS: Question[] = [
  {
    id: "d01",
    slug: "contains-duplicate",
    title: "Contains Duplicate",
    description: "Detect a repeat. The first real lesson in trading space for time.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 12,
    completedCount: 42100,
    companyTags: ["Google", "Amazon"],
    introducedInWeek: 1,
    relatedConcepts: ["Hashing", "HashSet", "Space–time trade-off"],
    prompt:
      "Given an integer array, return true if any value appears at least twice. Start with brute force, then make the trade that the interviewer is actually asking about.",
    requirements: ["Return true on the first repeat", "Handle empty and single-element arrays"],
    examples: [
      { input: `[1, 2, 3, 1]`, output: `true` },
      { input: `[1, 2, 3, 4]`, output: `false` },
    ],
    constraints: ["1 ≤ n ≤ 10⁵", "values fit in Int"],
    starterCode: `fun containsDuplicate(nums: IntArray): Boolean {
    TODO()
}`,
    solutionCode: `fun containsDuplicate(nums: IntArray): Boolean {
    val seen = HashSet<Int>(nums.size)
    for (n in nums) {
        if (!seen.add(n)) return true   // add returns false if already present
    }
    return false
}`,
    tests: [
      { name: "has duplicate", call: `containsDuplicate(intArrayOf(1,2,3,1))`, expected: `true` },
      { name: "no duplicate", call: `containsDuplicate(intArrayOf(1,2,3,4))`, expected: `false` },
      { name: "empty", call: `containsDuplicate(intArrayOf())`, expected: `false` },
      { name: "all same", call: `containsDuplicate(intArrayOf(2,2,2))`, expected: `true`, hidden: true },
    ],
    hints: [
      "Brute force is two nested loops — O(n²). What would let you answer 'have I seen this?' in constant time?",
      "`HashSet.add` returns false when the element was already present. One call does both jobs.",
      "`nums.toSet().size != nums.size` is a one-liner, but it always scans everything.",
    ],
    solution: {
      mentalModel:
        "Brute force asks 'is this equal to anything else?' n times. Hashing rewrites the question as 'have I seen this before?', which a set answers in O(1). That substitution — repeated search becomes membership — is the whole pattern.",
      straightforward: {
        label: "Brute force — O(n²)",
        code: `fun containsDuplicate(nums: IntArray): Boolean {
    for (i in nums.indices) {
        for (j in i + 1 until nums.size) {
            if (nums[i] == nums[j]) return true
        }
    }
    return false
}`,
      },
      improved: {
        label: "HashSet — O(n)",
        code: `fun containsDuplicate(nums: IntArray): Boolean {
    val seen = HashSet<Int>(nums.size)
    for (n in nums) if (!seen.add(n)) return true
    return false
}`,
      },
      lineByLine: [
        { line: "HashSet<Int>(nums.size)", note: "Pre-sizing avoids rehashing as the set grows. A small, free win." },
        { line: "if (!seen.add(n)) return true", note: "`add` returns false when the element was already there — membership test and insert in one operation." },
        { line: "return false", note: "Reached only after a full scan with no repeat." },
      ],
      whyItWorks: [
        "A hash set gives expected O(1) insert and membership, so one pass suffices.",
        "Returning on the first repeat means the best case is O(1) — a duplicate at the start exits immediately.",
      ],
      commonMistakes: [
        "`nums.toSet().size != nums.size` — correct, but always O(n) with no early exit and an extra allocation. Fine in production, weak as an interview answer unless you say why.",
        "Sorting first: O(n log n) and it mutates the input, for no benefit over hashing.",
        "Forgetting that the worst case for hashing is O(n) per operation under adversarial collisions.",
      ],
      alternatives: [
        {
          title: "Sort then scan",
          body: "O(n log n) time, O(1) extra space if sorting in place is permitted. The right answer when memory is the binding constraint — say so and you have shown you understood the trade rather than memorised one answer.",
        },
      ],
      complexity: { time: "O(n)", space: "O(n)", note: "The trade being made: linear extra memory to remove a nested loop." },
      inProduction:
        "Deduplicating ids from two paginated pages before rendering — exactly this, with `associateBy` or `distinctBy` doing the hashing.",
      followUps: [
        "What is the time complexity? The space complexity? Which trade did you make?",
        "What changes if the array does not fit in memory?",
        "What if you needed the duplicate values rather than a boolean?",
      ],
    },
  },
  {
    id: "d02",
    slug: "two-sum",
    title: "Two Sum",
    description: "Find the pair. One pass, if you invert the question.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 15,
    completedCount: 51300,
    companyTags: ["Google", "Amazon", "Meta"],
    introducedInWeek: 1,
    relatedConcepts: ["Hashing", "Complement lookup"],
    prompt:
      "Given an array and a target, return the indices of the two numbers that add to the target. Exactly one solution exists; you may not use the same element twice.",
    requirements: ["Return indices, not values", "One pass is achievable"],
    examples: [{ input: `nums = [2,7,11,15], target = 9`, output: `[0, 1]` }],
    constraints: ["2 ≤ n ≤ 10⁴", "Exactly one valid answer"],
    starterCode: `fun twoSum(nums: IntArray, target: Int): IntArray {
    TODO()
}`,
    solutionCode: `fun twoSum(nums: IntArray, target: Int): IntArray {
    val seen = HashMap<Int, Int>(nums.size)   // value -> index
    for (i in nums.indices) {
        val complement = target - nums[i]
        seen[complement]?.let { return intArrayOf(it, i) }
        seen[nums[i]] = i
    }
    return intArrayOf()
}`,
    tests: [
      { name: "basic", call: `twoSum(intArrayOf(2,7,11,15), 9)`, expected: `[0, 1]` },
      { name: "later pair", call: `twoSum(intArrayOf(3,2,4), 6)`, expected: `[1, 2]` },
      { name: "duplicates", call: `twoSum(intArrayOf(3,3), 6)`, expected: `[0, 1]`, hidden: true },
    ],
    hints: [
      "Instead of 'which two numbers add up to the target', ask 'have I already seen target − this one?'",
      "Store the value as the key and the index as the value, so the lookup gives you what you need to return.",
      "Check for the complement *before* inserting the current element, or `[3,3]` with target 6 finds the same index twice.",
    ],
    solution: {
      mentalModel:
        "The pair search collapses to a membership test the moment you realise the second number is fully determined by the first. You are not looking for a pair; you are looking for one specific value.",
      improved: {
        label: "One pass",
        code: `fun twoSum(nums: IntArray, target: Int): IntArray {
    val seen = HashMap<Int, Int>(nums.size)
    for (i in nums.indices) {
        seen[target - nums[i]]?.let { return intArrayOf(it, i) }
        seen[nums[i]] = i
    }
    return intArrayOf()
}`,
      },
      whyItWorks: [
        "Every pair has a later element; by the time you reach it, the earlier one is already in the map.",
        "Checking before inserting prevents an element pairing with itself.",
      ],
      commonMistakes: [
        "Inserting before checking, which breaks on `[3,3]`.",
        "Returning values instead of indices.",
        "Building the whole map first and then scanning — two passes where one suffices, and it reintroduces the self-pairing bug.",
      ],
      complexity: { time: "O(n)", space: "O(n)" },
      followUps: [
        "What if the array were sorted? (Two pointers, O(1) extra space.)",
        "What if you needed all pairs, not one?",
        "What if there could be no solution?",
      ],
    },
  },
  {
    id: "d03",
    slug: "valid-anagram",
    title: "Valid Anagram",
    description: "Counting beats sorting when the alphabet is small.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 12,
    completedCount: 33800,
    companyTags: ["Amazon", "Bloomberg"],
    introducedInWeek: 1,
    relatedConcepts: ["Hashing", "Frequency counting"],
    prompt: "Return true if `t` is an anagram of `s`.",
    requirements: ["Case-sensitive", "Handle unequal lengths early"],
    examples: [
      { input: `s = "anagram", t = "nagaram"`, output: `true` },
      { input: `s = "rat", t = "car"`, output: `false` },
    ],
    starterCode: `fun isAnagram(s: String, t: String): Boolean {
    TODO()
}`,
    solutionCode: `fun isAnagram(s: String, t: String): Boolean {
    if (s.length != t.length) return false

    val counts = IntArray(26)
    for (i in s.indices) {
        counts[s[i] - 'a']++
        counts[t[i] - 'a']--
    }
    return counts.all { it == 0 }
}`,
    tests: [
      { name: "anagram", call: `isAnagram("anagram", "nagaram")`, expected: `true` },
      { name: "not an anagram", call: `isAnagram("rat", "car")`, expected: `false` },
      { name: "different lengths", call: `isAnagram("a", "ab")`, expected: `false` },
    ],
    hints: [
      "Sorting both is O(n log n) and obviously correct. What is the alphabet size?",
      "A fixed-size array indexed by `char - 'a'` is a hash map with a perfect hash function.",
      "Increment for one string and decrement for the other in the same loop — everything should end at zero.",
    ],
    solution: {
      mentalModel:
        "When the key space is small and known, an array *is* the hash map — with no hashing, no collisions and perfect cache locality.",
      whyItWorks: [
        "Equal lengths plus all-zero counts is exactly the definition of an anagram.",
        "One combined pass avoids building two maps and comparing them.",
      ],
      commonMistakes: [
        "Assuming lowercase ASCII without saying so — with Unicode, `counts[c - 'a']` is out of bounds or wrong.",
        "Sorting when counting is available, without mentioning the trade.",
        "Missing the early length check, which is both a correctness guard and a fast path.",
      ],
      alternatives: [
        {
          title: "HashMap for arbitrary Unicode",
          body: "`s.groupingBy { it }.eachCount() == t.groupingBy { it }.eachCount()`. Handles any character set at the cost of hashing. Mentioning this is what separates a correct answer from a thoughtful one.",
        },
      ],
      complexity: { time: "O(n)", space: "O(1)", note: "The 26-element array does not grow with the input." },
      followUps: ["What if the inputs were Unicode? What if they were gigabytes long?"],
    },
  },
  {
    id: "d04",
    slug: "best-time-to-buy-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    description: "One pass, two variables. The gateway to dynamic programming.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 15,
    completedCount: 38600,
    companyTags: ["Amazon", "Google"],
    introducedInWeek: 1,
    relatedConcepts: ["Greedy / running minimum", "Kadane's insight"],
    prompt:
      "Given daily prices, return the maximum profit from one buy and one later sell. Return 0 if no profit is possible.",
    requirements: ["Buy must precede sell", "Return 0 rather than a negative profit"],
    examples: [
      { input: `[7,1,5,3,6,4]`, output: `5`, note: "buy at 1, sell at 6" },
      { input: `[7,6,4,3,1]`, output: `0` },
    ],
    starterCode: `fun maxProfit(prices: IntArray): Int {
    TODO()
}`,
    solutionCode: `fun maxProfit(prices: IntArray): Int {
    var minSoFar = Int.MAX_VALUE
    var best = 0
    for (price in prices) {
        if (price < minSoFar) minSoFar = price
        else if (price - minSoFar > best) best = price - minSoFar
    }
    return best
}`,
    tests: [
      { name: "profit exists", call: `maxProfit(intArrayOf(7,1,5,3,6,4))`, expected: `5` },
      { name: "no profit", call: `maxProfit(intArrayOf(7,6,4,3,1))`, expected: `0` },
      { name: "single day", call: `maxProfit(intArrayOf(5))`, expected: `0`, hidden: true },
    ],
    hints: [
      "At each day, the best sale today is today's price minus the cheapest day so far.",
      "You never need to know *which* day you bought — only the minimum seen.",
      "That single-variable state is what makes this O(1) space.",
    ],
    solution: {
      mentalModel:
        "Walk forward carrying the cheapest price seen. Every day, ask what you would make selling today. The answer is the maximum of those — a running minimum plus a running maximum.",
      whyItWorks: [
        "Because the minimum is always from an earlier day, the buy-before-sell constraint holds automatically.",
        "Initialising `best` to 0 encodes 'do not trade' as a valid choice.",
      ],
      commonMistakes: [
        "Nested loops — O(n²) and unnecessary.",
        "Tracking a maximum price instead of a minimum, which breaks the ordering constraint.",
        "Initialising `best` to `Int.MIN_VALUE` and returning a negative profit.",
      ],
      complexity: { time: "O(n)", space: "O(1)" },
      followUps: [
        "What if you could make unlimited transactions? (Sum every positive delta.)",
        "At most two transactions? (That is where real DP starts.)",
      ],
    },
  },
  {
    id: "d05",
    slug: "longest-substring-without-repeating",
    title: "Longest Substring Without Repeating Characters",
    description: "The sliding window, with the jump that makes it one pass.",
    difficulty: "Medium",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 25,
    completedCount: 29400,
    companyTags: ["Amazon", "Google", "Meta"],
    introducedInWeek: 2,
    relatedConcepts: ["Sliding window", "Last-seen index"],
    prompt: "Return the length of the longest substring with no repeated characters.",
    requirements: ["Substring, not subsequence — characters must be contiguous"],
    examples: [
      { input: `"abcabcbb"`, output: `3`, note: `"abc"` },
      { input: `"bbbbb"`, output: `1` },
      { input: `"pwwkew"`, output: `3`, note: `"wke"` },
    ],
    starterCode: `fun lengthOfLongestSubstring(s: String): Int {
    TODO()
}`,
    solutionCode: `fun lengthOfLongestSubstring(s: String): Int {
    val lastSeen = HashMap<Char, Int>()
    var start = 0
    var best = 0

    for (end in s.indices) {
        val c = s[end]
        val prev = lastSeen[c]
        // Only move start forward — never backwards, or the window breaks.
        if (prev != null && prev >= start) start = prev + 1
        lastSeen[c] = end
        best = maxOf(best, end - start + 1)
    }
    return best
}`,
    tests: [
      { name: "abcabcbb", call: `lengthOfLongestSubstring("abcabcbb")`, expected: `3` },
      { name: "bbbbb", call: `lengthOfLongestSubstring("bbbbb")`, expected: `1` },
      { name: "pwwkew", call: `lengthOfLongestSubstring("pwwkew")`, expected: `3` },
      { name: "empty", call: `lengthOfLongestSubstring("")`, expected: `0`, hidden: true },
    ],
    hints: [
      "Extend the window to the right. When a repeat appears, the window must start after the previous occurrence.",
      "Storing the last index of each character lets you jump `start` directly rather than shrinking one step at a time.",
      "`prev >= start` matters: a repeat from *before* the window is not a repeat within it.",
    ],
    solution: {
      mentalModel:
        "Two pointers defining a window that is always valid. The right edge advances every step; the left edge jumps forward only when the new character forces it.",
      whyItWorks: [
        "The `prev >= start` guard keeps `start` monotonic, so each index is visited a bounded number of times — that is what makes it O(n).",
        "Storing the last index turns 'shrink until valid' into a single assignment.",
      ],
      commonMistakes: [
        "Letting `start` move backwards when an old character reappears — the classic bug, and it produces wrong answers only on specific inputs like `\"abba\"`.",
        "Recomputing the window contents each step, which quietly makes it O(n²).",
        "Confusing substring with subsequence.",
      ],
      complexity: { time: "O(n)", space: "O(min(n, alphabet))" },
      inProduction: "Rate limiters over a time window are the same shape: advance the right edge, drop from the left when a constraint breaks.",
      followUps: ["Return the substring itself.", "Allow at most k repeats of any character."],
    },
  },
  {
    id: "d06",
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    description: "The canonical stack problem. Two failure modes, not one.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 15,
    completedCount: 36200,
    companyTags: ["Google", "Amazon", "Microsoft"],
    introducedInWeek: 3,
    relatedConcepts: ["Stack", "Matching pairs"],
    prompt: "Given a string of `()[]{}`, determine whether the brackets are correctly closed in the correct order.",
    requirements: ["Correct type must match", "Order must be respected", "Leftover open brackets are invalid"],
    examples: [
      { input: `"()[]{}"`, output: `true` },
      { input: `"(]"`, output: `false` },
      { input: `"([)]"`, output: `false` },
    ],
    starterCode: `fun isValid(s: String): Boolean {
    TODO()
}`,
    solutionCode: `fun isValid(s: String): Boolean {
    val pairs = mapOf(')' to '(', ']' to '[', '}' to '{')
    val stack = ArrayDeque<Char>()

    for (c in s) {
        val expectedOpen = pairs[c]
        if (expectedOpen == null) {
            stack.addLast(c)                                  // an opener
        } else if (stack.removeLastOrNull() != expectedOpen) {
            return false                                      // wrong type, or nothing to close
        }
    }
    return stack.isEmpty()                                    // no unclosed openers
}`,
    tests: [
      { name: "valid", call: `isValid("()[]{}")`, expected: `true` },
      { name: "wrong type", call: `isValid("(]")`, expected: `false` },
      { name: "interleaved", call: `isValid("([)]")`, expected: `false` },
      { name: "unclosed", call: `isValid("(")`, expected: `false`, hidden: true },
    ],
    hints: [
      "The most recently opened bracket must be the first to close. What data structure has that property?",
      "There are two ways to be invalid: a mismatch during the scan, and leftovers at the end.",
      "`removeLastOrNull()` handles the 'closing with nothing open' case without a separate check.",
    ],
    solution: {
      mentalModel:
        "Nesting is last-in-first-out by definition, so a stack is not a clever trick — it is the direct encoding of the rule.",
      whyItWorks: [
        "Pushing openers and popping on closers enforces order and type in one operation.",
        "The final emptiness check catches the case the loop cannot see.",
      ],
      commonMistakes: [
        "Forgetting the final `isEmpty()` check, so `\"(\"` passes.",
        "Counting brackets instead of stacking them — `\"([)]\"` has correct counts and is invalid.",
        "Using `java.util.Stack`, which is synchronised and legacy. `ArrayDeque` is the Kotlin choice.",
      ],
      complexity: { time: "O(n)", space: "O(n)" },
      followUps: ["Return the index of the first mismatch.", "Support arbitrary custom bracket pairs."],
    },
  },
  {
    id: "d07",
    slug: "binary-search",
    title: "Binary Search",
    description: "Everyone knows it. Rather fewer write it without an overflow or an infinite loop.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 15,
    completedCount: 34700,
    companyTags: ["Google", "Apple"],
    introducedInWeek: 4,
    relatedConcepts: ["Binary search", "Invariants", "Loop termination"],
    prompt: "Given a sorted array and a target, return its index or −1.",
    requirements: ["O(log n)", "No infinite loops", "No integer overflow"],
    examples: [
      { input: `nums = [-1,0,3,5,9,12], target = 9`, output: `4` },
      { input: `nums = [-1,0,3,5,9,12], target = 2`, output: `-1` },
    ],
    starterCode: `fun search(nums: IntArray, target: Int): Int {
    TODO()
}`,
    solutionCode: `fun search(nums: IntArray, target: Int): Int {
    var low = 0
    var high = nums.size - 1

    while (low <= high) {
        val mid = low + (high - low) / 2      // no overflow
        when {
            nums[mid] == target -> return mid
            nums[mid] < target -> low = mid + 1
            else -> high = mid - 1
        }
    }
    return -1
}`,
    tests: [
      { name: "found", call: `search(intArrayOf(-1,0,3,5,9,12), 9)`, expected: `4` },
      { name: "not found", call: `search(intArrayOf(-1,0,3,5,9,12), 2)`, expected: `-1` },
      { name: "single element", call: `search(intArrayOf(5), 5)`, expected: `0` },
      { name: "empty", call: `search(intArrayOf(), 1)`, expected: `-1`, hidden: true },
    ],
    hints: [
      "`(low + high) / 2` overflows for large indices. `low + (high - low) / 2` does not.",
      "`while (low <= high)` with an inclusive `high` — mixing an exclusive bound with `<=` gives an off-by-one.",
      "Both branches must exclude `mid`, or the range never shrinks and the loop never ends.",
    ],
    solution: {
      mentalModel:
        "Hold an invariant: if the target exists, it is in `[low, high]`. Every step must shrink that range while preserving the invariant. Every binary search bug is a violated invariant.",
      whyItWorks: [
        "`mid + 1` and `mid - 1` guarantee strict shrinkage, so termination is assured.",
        "`low + (high - low) / 2` cannot overflow because the difference fits.",
      ],
      commonMistakes: [
        "`(low + high) / 2` — the bug that sat in the JDK's own binary search for nine years.",
        "`low = mid` instead of `mid + 1`, giving an infinite loop when `high == low + 1`.",
        "Mixing `high = size` with `low <= high`, reading past the end.",
      ],
      alternatives: [
        {
          title: "Lower bound",
          body: "The `while (low < high)` form that converges on the first element not less than the target is more flexible — it answers 'where would this go?' as well as 'is it here?'. Worth knowing, because most real binary-search questions are lower-bound questions in disguise.",
        },
      ],
      complexity: { time: "O(log n)", space: "O(1)" },
      followUps: [
        "Find the first and last occurrence of a repeated value.",
        "Search a rotated sorted array.",
      ],
    },
  },
  {
    id: "d08",
    slug: "reverse-linked-list",
    title: "Reverse a Linked List",
    description: "Three pointers. Draw it before you write it.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 18,
    completedCount: 31500,
    companyTags: ["Google", "Meta", "Microsoft"],
    introducedInWeek: 5,
    relatedConcepts: ["Linked list", "Pointer manipulation"],
    prompt: "Reverse a singly linked list and return the new head.",
    requirements: ["In place", "O(1) extra space", "Handle empty and single-node lists"],
    examples: [{ input: `1→2→3→null`, output: `3→2→1→null` }],
    starterCode: `class ListNode(var value: Int) {
    var next: ListNode? = null
}

fun reverseList(head: ListNode?): ListNode? {
    TODO()
}`,
    solutionCode: `fun reverseList(head: ListNode?): ListNode? {
    var previous: ListNode? = null
    var current = head

    while (current != null) {
        val next = current.next     // save it before we destroy the link
        current.next = previous     // reverse this node's pointer
        previous = current          // advance
        current = next
    }
    return previous                 // previous is the old tail = new head
}`,
    tests: [
      { name: "three nodes", call: `reverseList(1→2→3)`, expected: `3→2→1` },
      { name: "single node", call: `reverseList(1)`, expected: `1` },
      { name: "empty", call: `reverseList(null)`, expected: `null` },
    ],
    hints: [
      "You need three references: where you came from, where you are, where you are going.",
      "Save `current.next` before overwriting it, or the rest of the list is unreachable.",
      "When the loop ends, `current` is null — so the answer is `previous`.",
    ],
    solution: {
      mentalModel:
        "Walk the list flipping one arrow at a time. The only difficulty is that flipping an arrow destroys your route forward, so you must save it first.",
      improved: {
        label: "Recursive",
        code: `fun reverseList(head: ListNode?): ListNode? {
    if (head?.next == null) return head
    val newHead = reverseList(head.next)
    head.next?.next = head
    head.next = null
    return newHead
}`,
      },
      whyItWorks: [
        "Each iteration reverses exactly one link and advances by one node, so it is O(n).",
        "Nothing is allocated, so space is O(1).",
      ],
      commonMistakes: [
        "Overwriting `current.next` before saving it.",
        "Returning `head`, which is now the tail.",
        "The recursive version uses O(n) stack — fine for interviews, a genuine risk on untrusted input.",
      ],
      complexity: { time: "O(n)", space: "O(1) iterative, O(n) recursive" },
      followUps: ["Reverse only nodes between positions m and n.", "Reverse in groups of k."],
    },
  },
  {
    id: "d09",
    slug: "maximum-depth-binary-tree",
    title: "Maximum Depth of a Binary Tree",
    description: "The smallest possible tree recursion — and the base case is the whole lesson.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 12,
    completedCount: 28900,
    companyTags: ["Amazon", "Google"],
    introducedInWeek: 6,
    relatedConcepts: ["Trees", "DFS", "Recursion"],
    prompt: "Return the maximum depth: the number of nodes on the longest root-to-leaf path.",
    requirements: ["Empty tree has depth 0"],
    examples: [{ input: `[3,9,20,null,null,15,7]`, output: `3` }],
    starterCode: `class TreeNode(var value: Int) {
    var left: TreeNode? = null
    var right: TreeNode? = null
}

fun maxDepth(root: TreeNode?): Int {
    TODO()
}`,
    solutionCode: `fun maxDepth(root: TreeNode?): Int {
    if (root == null) return 0
    return 1 + maxOf(maxDepth(root.left), maxDepth(root.right))
}`,
    tests: [
      { name: "balanced-ish", call: `maxDepth([3,9,20,null,null,15,7])`, expected: `3` },
      { name: "empty", call: `maxDepth(null)`, expected: `0` },
      { name: "single node", call: `maxDepth([1])`, expected: `1` },
    ],
    hints: [
      "The depth of a tree is one more than the deeper of its two subtrees.",
      "The base case is null, not leaf — handling null covers leaves automatically.",
    ],
    solution: {
      mentalModel:
        "A tree is defined recursively, so the natural algorithm is too. Trust the recursion: assume the calls return the right answer for the subtrees and combine them.",
      improved: {
        label: "Iterative BFS — bounded stack",
        code: `fun maxDepth(root: TreeNode?): Int {
    if (root == null) return 0
    val queue = ArrayDeque<TreeNode>().apply { add(root) }
    var depth = 0
    while (queue.isNotEmpty()) {
        repeat(queue.size) {                 // one full level
            val node = queue.removeFirst()
            node.left?.let(queue::addLast)
            node.right?.let(queue::addLast)
        }
        depth++
    }
    return depth
}`,
      },
      whyItWorks: [
        "The null base case makes leaves fall out naturally — no separate leaf check.",
        "The BFS variant counts levels explicitly and uses heap memory rather than the call stack.",
      ],
      commonMistakes: [
        "Making the leaf the base case and then mishandling single-child nodes.",
        "Returning the max without adding one for the current node.",
        "Ignoring stack depth on a degenerate (linked-list-shaped) tree.",
      ],
      complexity: { time: "O(n)", space: "O(h) — O(n) worst case for a skewed tree" },
      followUps: ["Minimum depth — why is it not symmetric?", "Is the tree balanced?"],
    },
  },
  {
    id: "d10",
    slug: "level-order-traversal",
    title: "Binary Tree Level Order Traversal",
    description: "BFS where the level boundary is the thing you must get right.",
    difficulty: "Medium",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 20,
    completedCount: 22600,
    companyTags: ["Amazon", "Meta", "Google"],
    introducedInWeek: 6,
    relatedConcepts: ["BFS", "Queue", "Level boundaries"],
    prompt: "Return node values grouped by level, top to bottom, left to right.",
    requirements: ["One inner list per level", "Empty tree returns an empty list"],
    examples: [{ input: `[3,9,20,null,null,15,7]`, output: `[[3],[9,20],[15,7]]` }],
    starterCode: `fun levelOrder(root: TreeNode?): List<List<Int>> {
    TODO()
}`,
    solutionCode: `fun levelOrder(root: TreeNode?): List<List<Int>> {
    if (root == null) return emptyList()

    val result = mutableListOf<List<Int>>()
    val queue = ArrayDeque<TreeNode>().apply { addLast(root) }

    while (queue.isNotEmpty()) {
        val levelSize = queue.size          // snapshot BEFORE adding children
        val level = ArrayList<Int>(levelSize)
        repeat(levelSize) {
            val node = queue.removeFirst()
            level += node.value
            node.left?.let(queue::addLast)
            node.right?.let(queue::addLast)
        }
        result += level
    }
    return result
}`,
    tests: [
      { name: "three levels", call: `levelOrder([3,9,20,null,null,15,7])`, expected: `[[3], [9, 20], [15, 7]]` },
      { name: "empty", call: `levelOrder(null)`, expected: `[]` },
      { name: "single", call: `levelOrder([1])`, expected: `[[1]]` },
    ],
    hints: [
      "Plain BFS gives you the right order but loses the level boundaries.",
      "Capture `queue.size` before the inner loop — that count is exactly one level.",
      "Adding children inside the loop changes the size, which is why the snapshot matters.",
    ],
    solution: {
      mentalModel:
        "BFS visits in level order for free. The work is marking where one level ends — and the queue's size at the top of each round is precisely that boundary.",
      whyItWorks: [
        "At the start of each outer iteration the queue holds exactly one complete level.",
        "Draining exactly that many nodes leaves the queue holding exactly the next level.",
      ],
      commonMistakes: [
        "Reading `queue.size` inside the inner loop, so the boundary drifts as children are added.",
        "Tracking depth with a parallel structure when the size snapshot already encodes it.",
        "`java.util.LinkedList` as a queue — `ArrayDeque` is faster and idiomatic.",
      ],
      complexity: { time: "O(n)", space: "O(w) — the widest level" },
      followUps: ["Zigzag order.", "Right side view — which is this with one line changed."],
    },
  },
  {
    id: "d11",
    slug: "group-anagrams",
    title: "Group Anagrams",
    description: "Design the key, and the problem solves itself.",
    difficulty: "Medium",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 20,
    completedCount: 19800,
    companyTags: ["Amazon", "Uber"],
    introducedInWeek: 2,
    relatedConcepts: ["Hashing", "Canonical form"],
    prompt: "Group strings that are anagrams of one another.",
    requirements: ["Group order does not matter", "Within-group order does not matter"],
    examples: [{ input: `["eat","tea","tan","ate","nat","bat"]`, output: `[["eat","tea","ate"],["tan","nat"],["bat"]]` }],
    starterCode: `fun groupAnagrams(strs: Array<String>): List<List<String>> {
    TODO()
}`,
    solutionCode: `fun groupAnagrams(strs: Array<String>): List<List<String>> =
    strs.groupBy { word ->
        val counts = IntArray(26)
        for (c in word) counts[c - 'a']++
        counts.joinToString(",")     // canonical key, O(n) rather than O(n log n)
    }.values.toList()`,
    tests: [
      { name: "groups correctly", call: `groupAnagrams(arrayOf("eat","tea","tan","ate","nat","bat"))`, expected: `3 groups` },
      { name: "empty", call: `groupAnagrams(arrayOf())`, expected: `[]` },
    ],
    hints: [
      "Two strings belong together if some canonical form of them is equal. What canonical form?",
      "Sorted characters works. A character-count signature works and is faster.",
      "`groupBy` in Kotlin does the bucketing once you have the key.",
    ],
    solution: {
      mentalModel:
        "Grouping problems reduce to key design. Find a function that is equal exactly for members of the same group, then let a hash map do the rest.",
      alternatives: [
        {
          title: "Sorted key",
          body: "`word.toCharArray().sorted().joinToString(\"\")` is shorter and O(k log k) per word. Preferable when the alphabet is not small and known.",
        },
      ],
      whyItWorks: [
        "The count signature is identical for anagrams and different otherwise.",
        "`groupBy` builds the map in one pass.",
      ],
      commonMistakes: [
        "Comparing every pair — O(n²·k).",
        "Using the count array itself as a key: arrays use identity equality in a HashMap, so every entry lands in its own bucket.",
      ],
      complexity: { time: "O(n·k)", space: "O(n·k)" },
      followUps: ["What if the strings were Unicode? What if there were millions?"],
    },
  },
  {
    id: "d12",
    slug: "merge-intervals",
    title: "Merge Intervals",
    description: "Sort, then sweep. The pattern behind most interval questions.",
    difficulty: "Medium",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 22,
    completedCount: 17300,
    companyTags: ["Google", "Meta", "Bloomberg"],
    introducedInWeek: 7,
    relatedConcepts: ["Sorting", "Interval sweep"],
    prompt: "Merge all overlapping intervals and return the non-overlapping set covering the same range.",
    requirements: ["Touching intervals ([1,4],[4,5]) merge", "Input may be unsorted"],
    examples: [{ input: `[[1,3],[2,6],[8,10],[15,18]]`, output: `[[1,6],[8,10],[15,18]]` }],
    starterCode: `fun merge(intervals: Array<IntArray>): Array<IntArray> {
    TODO()
}`,
    solutionCode: `fun merge(intervals: Array<IntArray>): Array<IntArray> {
    if (intervals.isEmpty()) return intervals

    val sorted = intervals.sortedBy { it[0] }
    val merged = mutableListOf<IntArray>()

    for (interval in sorted) {
        val last = merged.lastOrNull()
        if (last != null && interval[0] <= last[1]) {
            last[1] = maxOf(last[1], interval[1])   // extend in place
        } else {
            merged += intArrayOf(interval[0], interval[1])
        }
    }
    return merged.toTypedArray()
}`,
    tests: [
      { name: "overlapping", call: `merge([[1,3],[2,6],[8,10],[15,18]])`, expected: `[[1,6],[8,10],[15,18]]` },
      { name: "touching", call: `merge([[1,4],[4,5]])`, expected: `[[1,5]]` },
      { name: "contained", call: `merge([[1,10],[2,3]])`, expected: `[[1,10]]`, hidden: true },
    ],
    hints: [
      "Once sorted by start, an interval can only overlap the one immediately before it.",
      "`maxOf(last[1], interval[1])` handles the fully-contained case, which a blind assignment gets wrong.",
      "Copy the interval when appending — extending in place would mutate the caller's array.",
    ],
    solution: {
      mentalModel:
        "Sorting turns a pairwise-comparison problem into a single left-to-right sweep. That reduction is the pattern; the merging itself is bookkeeping.",
      whyItWorks: [
        "Sorted starts mean overlap can only be with the most recent merged interval.",
        "Taking the max end correctly handles both extension and containment.",
      ],
      commonMistakes: [
        "`last[1] = interval[1]` without the max, shrinking a merged interval when one is contained.",
        "Using `<` rather than `<=` and failing to merge touching intervals.",
        "Mutating the input array's inner arrays.",
      ],
      complexity: { time: "O(n log n)", space: "O(n)" },
      inProduction: "Calendar availability, log-session stitching and rate-limit windows are all interval merges.",
      followUps: ["Insert a new interval into an already-merged list in O(n).", "Find the maximum number of overlapping intervals."],
    },
  },
  {
    id: "d13",
    slug: "number-of-islands",
    title: "Number of Islands",
    description: "Graph traversal on a grid, with the visited set as the crux.",
    difficulty: "Medium",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 25,
    completedCount: 20100,
    companyTags: ["Amazon", "Google", "Meta"],
    introducedInWeek: 9,
    relatedConcepts: ["Graphs", "DFS/BFS", "Flood fill"],
    prompt:
      "Given a grid of '1' (land) and '0' (water), count the islands. Land connects horizontally and vertically only.",
    requirements: ["Do not revisit cells", "Handle an empty grid"],
    examples: [{ input: `[["1","1","0"],["0","1","0"],["0","0","1"]]`, output: `2` }],
    starterCode: `fun numIslands(grid: Array<CharArray>): Int {
    TODO()
}`,
    solutionCode: `fun numIslands(grid: Array<CharArray>): Int {
    if (grid.isEmpty()) return 0
    var count = 0

    fun sink(r: Int, c: Int) {
        if (r !in grid.indices || c !in grid[0].indices) return
        if (grid[r][c] != '1') return
        grid[r][c] = '0'                 // mark visited by sinking it
        sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1)
    }

    for (r in grid.indices) {
        for (c in grid[0].indices) {
            if (grid[r][c] == '1') {
                count++
                sink(r, c)
            }
        }
    }
    return count
}`,
    tests: [
      { name: "two islands", call: `numIslands([["1","1","0"],["0","1","0"],["0","0","1"]])`, expected: `2` },
      { name: "all water", call: `numIslands([["0"]])`, expected: `0` },
      { name: "one big island", call: `numIslands([["1","1"],["1","1"]])`, expected: `1`, hidden: true },
    ],
    hints: [
      "Each time you find unvisited land, you have found a new island — then erase all of it.",
      "Mutating the grid is the cheapest visited set. Say out loud that it destroys the input, and offer a separate boolean grid if that matters.",
      "Bounds check before reading, not after.",
    ],
    solution: {
      mentalModel:
        "A grid is a graph where each cell is a node with up to four edges. Counting connected components is the classic traversal problem, and the only design decision is how you record 'visited'.",
      alternatives: [
        {
          title: "BFS with an explicit queue",
          body: "Same complexity, but heap memory instead of call stack. On a 1000×1000 grid of all land, the recursive version can overflow the stack — worth raising unprompted.",
        },
      ],
      whyItWorks: [
        "Sinking visited land guarantees each cell is processed once, giving O(rows × cols).",
        "The outer scan starts a traversal exactly once per component.",
      ],
      commonMistakes: [
        "No visited marking — infinite recursion.",
        "Counting inside the traversal rather than at the point it starts.",
        "Stack overflow on large all-land grids.",
        "Mutating the input without mentioning it.",
      ],
      complexity: { time: "O(r × c)", space: "O(r × c) worst-case recursion depth" },
      followUps: ["Largest island by area.", "What if the grid did not fit in memory?"],
    },
  },
  {
    id: "d14",
    slug: "top-k-frequent",
    title: "Top K Frequent Elements",
    description: "A heap, or the counting trick that beats it.",
    difficulty: "Medium",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 22,
    completedCount: 16400,
    companyTags: ["Amazon", "Meta"],
    introducedInWeek: 8,
    relatedConcepts: ["Heaps", "Bucket sort", "Frequency counting"],
    prompt: "Return the k most frequent elements. You may return them in any order.",
    requirements: ["Better than O(n log n) is possible", "1 ≤ k ≤ distinct element count"],
    examples: [{ input: `nums = [1,1,1,2,2,3], k = 2`, output: `[1, 2]` }],
    starterCode: `fun topKFrequent(nums: IntArray, k: Int): IntArray {
    TODO()
}`,
    solutionCode: `fun topKFrequent(nums: IntArray, k: Int): IntArray {
    val counts = HashMap<Int, Int>()
    for (n in nums) counts[n] = (counts[n] ?: 0) + 1

    // A frequency can never exceed nums.size, so bucket by count.
    val buckets = Array(nums.size + 1) { mutableListOf<Int>() }
    for ((value, count) in counts) buckets[count] += value

    val result = ArrayList<Int>(k)
    for (count in buckets.indices.reversed()) {
        for (value in buckets[count]) {
            result += value
            if (result.size == k) return result.toIntArray()
        }
    }
    return result.toIntArray()
}`,
    tests: [
      { name: "basic", call: `topKFrequent(intArrayOf(1,1,1,2,2,3), 2)`, expected: `[1, 2]` },
      { name: "k equals distinct", call: `topKFrequent(intArrayOf(1,2), 2)`, expected: `[1, 2]` },
      { name: "single element", call: `topKFrequent(intArrayOf(1), 1)`, expected: `[1]`, hidden: true },
    ],
    hints: [
      "A min-heap of size k gives O(n log k) — a good answer.",
      "But frequencies are bounded by n, so they can be used as array indices directly.",
      "Bucket sort by frequency gives O(n) with no comparisons.",
    ],
    solution: {
      mentalModel:
        "Two ways to get the top k: keep a heap of the best k seen, or exploit a bounded key range and bucket. Whenever the sort key is a small bounded integer, bucketing beats comparison sorting.",
      alternatives: [
        {
          title: "Min-heap of size k",
          body: "`PriorityQueue(compareBy { counts[it] })`, evicting when size exceeds k. O(n log k), O(k) space. It is the answer most interviewers expect — offer the bucket version as the improvement.",
        },
      ],
      whyItWorks: [
        "Counting is O(n); bucketing is O(distinct); the reverse scan is O(n) in total.",
        "No element can have a frequency greater than the array length, which is what makes the bucket array safe.",
      ],
      commonMistakes: [
        "Sorting all counts — O(n log n), correct but not the intended answer.",
        "A max-heap of all elements when a size-k min-heap suffices.",
        "Off-by-one on the bucket array size: frequencies run to n inclusive.",
      ],
      complexity: { time: "O(n)", space: "O(n)" },
      followUps: ["What if the stream were unbounded? (Count-min sketch, approximate answers.)"],
    },
  },
  {
    id: "d15",
    slug: "climbing-stairs",
    title: "Climbing Stairs",
    description: "The smallest honest dynamic programming problem.",
    difficulty: "Easy",
    format: "coding",
    track: "Interview",
    topics: ["dsa"],
    estimatedMinutes: 15,
    completedCount: 26800,
    companyTags: ["Amazon", "Apple"],
    introducedInWeek: 11,
    relatedConcepts: ["Dynamic programming", "Fibonacci", "State compression"],
    prompt:
      "You can climb 1 or 2 steps at a time. In how many distinct ways can you reach step n?",
    requirements: ["n ≥ 1", "O(n) time, O(1) space is achievable"],
    examples: [
      { input: `n = 3`, output: `3`, note: `1+1+1, 1+2, 2+1` },
      { input: `n = 4`, output: `5` },
    ],
    starterCode: `fun climbStairs(n: Int): Int {
    TODO()
}`,
    solutionCode: `fun climbStairs(n: Int): Int {
    if (n <= 2) return n

    var twoBack = 1   // ways(1)
    var oneBack = 2   // ways(2)
    repeat(n - 2) {
        val current = oneBack + twoBack
        twoBack = oneBack
        oneBack = current
    }
    return oneBack
}`,
    tests: [
      { name: "n = 3", call: `climbStairs(3)`, expected: `3` },
      { name: "n = 4", call: `climbStairs(4)`, expected: `5` },
      { name: "n = 1", call: `climbStairs(1)`, expected: `1` },
    ],
    hints: [
      "To reach step n you arrived from n−1 or n−2. So ways(n) = ways(n−1) + ways(n−2).",
      "Naive recursion recomputes the same subproblems exponentially — that is the motivation for DP.",
      "You only ever need the last two values, so the table collapses to two variables.",
    ],
    solution: {
      mentalModel:
        "DP is a recurrence plus memory. Write the recurrence honestly, then ask how much of the table you actually need. Here the answer is two cells.",
      straightforward: {
        label: "Naive recursion — O(2ⁿ)",
        code: `fun climbStairs(n: Int): Int =
    if (n <= 2) n else climbStairs(n - 1) + climbStairs(n - 2)`,
      },
      whyItWorks: [
        "Each step's answer depends only on the two before it, so a bottom-up loop computes each exactly once.",
        "Rolling two variables removes the O(n) array entirely.",
      ],
      commonMistakes: [
        "Submitting the naive recursion — it is correct and unusably slow past n ≈ 40.",
        "Off-by-one in the base cases; `ways(2) = 2`, not 1.",
        "Keeping the whole array when two variables suffice (a fine first answer, but say you noticed).",
      ],
      complexity: { time: "O(n)", space: "O(1)" },
      followUps: [
        "What if you could climb 1, 2 or 3 steps?",
        "What if certain steps were broken?",
        "What if each step had a cost and you wanted the cheapest route?",
      ],
    },
  },
];
