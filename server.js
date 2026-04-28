const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.disable('x-powered-by');

app.use(express.json());

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowAnyOrigin = FRONTEND_ORIGINS.length === 0 || FRONTEND_ORIGINS.includes('*');
    const isAllowedOrigin = allowAnyOrigin || (origin && FRONTEND_ORIGINS.includes(origin));

    if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowAnyOrigin ? '*' : origin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// 50 DSA Questions Database
const dsaQuestions = [
    { id: "q1", question: "What is the time complexity of searching for an element in a balanced Binary Search Tree?", options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correct: 2 },
    { id: "q2", question: "Which data structure operates on a Last-In-First-Out (LIFO) principle?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: 1 },
    { id: "q3", question: "Which algorithm is used to find the shortest path in a graph with non-negative edge weights?", options: ["Dijkstra's Algorithm", "Kruskal's Algorithm", "Prim's Algorithm", "Depth First Search"], correct: 0 },
    { id: "q4", question: "What is the worst-case time complexity of QuickSort?", options: ["O(n log n)", "O(n)", "O(n^2)", "O(1)"], correct: 2 },
    { id: "q5", question: "Which data structure is most suitable for implementing a priority queue?", options: ["Array", "Linked List", "Heap", "Stack"], correct: 2 },
    { id: "q6", question: "In a Hash Table, what occurs when two keys hash to the same index?", options: ["Syntax Error", "Collision", "Overflow", "Rehashing"], correct: 1 },
    { id: "q7", question: "What is the primary advantage of a Doubly Linked List over a Singly Linked List?", options: ["Less memory usage", "Faster sequential access", "O(1) random access", "Can be traversed in both directions"], correct: 3 },
    { id: "q8", question: "Which traversal method visits the root node after its children in a binary tree?", options: ["In-order", "Pre-order", "Post-order", "Level-order"], correct: 2 },
    { id: "q9", question: "Which dynamic programming problem involves finding the maximum value that fits within a specific capacity?", options: ["Tower of Hanoi", "Traveling Salesperson", "Knapsack Problem", "Longest Common Subsequence"], correct: 2 },
    { id: "q10", question: "What is the space complexity of an adjacency matrix representation of a graph with V vertices?", options: ["O(V)", "O(V + E)", "O(E)", "O(V^2)"], correct: 3 },
    { id: "q11", question: "Which sorting algorithm is NOT comparison-based?", options: ["Merge Sort", "Heap Sort", "Radix Sort", "Selection Sort"], correct: 2 },
    { id: "q12", question: "What data structure does Breadth-First Search (BFS) utilize?", options: ["Stack", "Queue", "Priority Queue", "Hash Map"], correct: 1 },
    { id: "q13", question: "What is the balance factor of an AVL tree node?", options: ["Height of left subtree minus height of right subtree", "Number of left children minus right children", "Difference between node values", "Total number of nodes"], correct: 0 },
    { id: "q14", question: "Which algorithmic paradigm is characterized by 'making the locally optimal choice at each stage'?", options: ["Dynamic Programming", "Backtracking", "Divide and Conquer", "Greedy Algorithm"], correct: 3 },
    { id: "q15", question: "What is the maximum number of children a node can have in a B-Tree of order m?", options: ["m-1", "m", "m+1", "log m"], correct: 1 },
    { id: "q16", question: "Which algorithm finds the Minimum Spanning Tree (MST) of a graph?", options: ["Bellman-Ford", "Floyd-Warshall", "Kruskal's Algorithm", "A* Search"], correct: 2 },
    { id: "q17", question: "In a min-heap, where is the smallest element located?", options: ["At the leaves", "At the root", "At the rightmost node", "In the middle level"], correct: 1 },
    { id: "q18", question: "What problem occurs in an unoptimized recursive implementation of calculating Fibonacci numbers?", options: ["Stack Overflow", "Memory Leak", "Overlapping Subproblems calculated repeatedly", "Infinite Loop"], correct: 2 },
    { id: "q19", question: "What is the time complexity of inserting an element at the beginning of a singly linked list?", options: ["O(1)", "O(n)", "O(log n)", "O(n^2)"], correct: 0 },
    { id: "q20", question: "Which string matching algorithm uses a prefix table (LPS array)?", options: ["Rabin-Karp", "Knuth-Morris-Pratt (KMP)", "Boyer-Moore", "Naive Search"], correct: 1 },
    { id: "q21", question: "A complete binary tree with n nodes has exactly how many leaf nodes?", options: ["n/2", "ceil(n/2)", "n", "log n"], correct: 1 },
    { id: "q22", question: "What is a characteristic of Topological Sort?", options: ["It works only on Directed Acyclic Graphs (DAGs)", "It finds the shortest path", "It only applies to undirected graphs", "It sorts graph edges by weight"], correct: 0 },
    { id: "q23", question: "Which data structure is typically used to implement a cache with an LRU (Least Recently Used) policy?", options: ["Array and Queue", "Hash Map and Doubly Linked List", "Binary Search Tree", "Max Heap"], correct: 1 },
    { id: "q24", question: "In graph theory, what is a cycle?", options: ["A path that starts and ends at the same vertex", "An isolated vertex", "A directed edge pointing to itself", "A path visiting all vertices exactly once"], correct: 0 },
    { id: "q25", question: "What is the worst-case time complexity of Merge Sort?", options: ["O(n)", "O(n log n)", "O(n^2)", "O(1)"], correct: 1 },
    { id: "q26", question: "Which operation is NOT typically supported in O(1) time by a Hash Map?", options: ["Insertion", "Deletion", "Search", "Finding the maximum element"], correct: 3 },
    { id: "q27", question: "What is a Trie commonly used for?", options: ["Sorting numbers", "Graph traversal", "Prefix matching in strings", "Finding shortest paths"], correct: 2 },
    { id: "q28", question: "What makes a binary tree a Binary Search Tree (BST)?", options: ["Every node has exactly two children", "Left child is smaller, right child is greater than parent", "It is perfectly balanced", "All leaves are at the same level"], correct: 1 },
    { id: "q29", question: "Which matrix representation is most memory-efficient for a sparse graph?", options: ["Adjacency Matrix", "Incidence Matrix", "Adjacency List", "Distance Matrix"], correct: 2 },
    { id: "q30", question: "What technique does Binary Search use?", options: ["Dynamic Programming", "Greedy", "Backtracking", "Divide and Conquer"], correct: 3 },
    { id: "q31", question: "What is the average-case time complexity of Binary Search?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], correct: 1 },
    { id: "q32", question: "Which traversal of a BST gives elements in sorted order?", options: ["Pre-order", "Post-order", "In-order", "Level-order"], correct: 2 },
    { id: "q33", question: "What is the worst-case time complexity of searching in an unbalanced BST?", options: ["O(log n)", "O(1)", "O(n)", "O(n log n)"], correct: 2 },
    { id: "q34", question: "Which data structure is used internally by recursion?", options: ["Queue", "Heap", "Stack", "Hash Table"], correct: 2 },
    { id: "q35", question: "Which algorithm is commonly used for cycle detection in a directed graph using DFS?", options: ["Union-Find", "Color Marking / Recursion Stack", "Prim's Algorithm", "Dijkstra's Algorithm"], correct: 1 },
    { id: "q36", question: "What is the time complexity of Heap Sort in the worst case?", options: ["O(n)", "O(n^2)", "O(log n)", "O(n log n)"], correct: 3 },
    { id: "q37", question: "Which of the following is true for a stable sorting algorithm?", options: ["It always runs in O(n log n)", "Equal elements keep their relative order", "It uses no extra space", "It only works for integers"], correct: 1 },
    { id: "q38", question: "What is the main idea behind memoization?", options: ["Sort data before processing", "Store results of expensive function calls and reuse them", "Split arrays into halves", "Use greedy choices at each step"], correct: 1 },
    { id: "q39", question: "In Union-Find (Disjoint Set), which optimization helps flatten trees?", options: ["Path Compression", "Breadth-First Search", "Topological Sorting", "Bucketization"], correct: 0 },
    { id: "q40", question: "Which graph algorithm can handle negative edge weights (without negative cycles)?", options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Prim's Algorithm", "Kruskal's Algorithm"], correct: 1 },
    { id: "q41", question: "What is the best-case time complexity of Bubble Sort with an optimized early-exit flag?", options: ["O(1)", "O(log n)", "O(n)", "O(n^2)"], correct: 2 },
    { id: "q42", question: "Which data structure is ideal for checking balanced parentheses?", options: ["Queue", "Stack", "Trie", "Graph"], correct: 1 },
    { id: "q43", question: "What does the two-pointer technique usually help optimize?", options: ["Memory only", "Nested-loop style scans on sorted/sequential data", "Graph coloring", "Hash collisions"], correct: 1 },
    { id: "q44", question: "In sliding window problems on arrays/strings, what is commonly maintained?", options: ["A dynamic subset range", "A recursive call stack", "A spanning tree", "A disjoint set"], correct: 0 },
    { id: "q45", question: "Which structure is used for implementing BFS shortest path in an unweighted graph?", options: ["Stack", "Queue", "Priority Queue", "Segment Tree"], correct: 1 },
    { id: "q46", question: "What is the time complexity to build a heap from n elements using heapify?", options: ["O(n)", "O(log n)", "O(n log n)", "O(n^2)"], correct: 0 },
    { id: "q47", question: "Which tree data structure is commonly used for range sum queries with updates?", options: ["Trie", "Segment Tree", "AVL Tree", "Suffix Tree"], correct: 1 },
    { id: "q48", question: "What is the key property of a min-priority queue?", options: ["Largest key is removed first", "Elements are sorted after each insertion", "Smallest key is removed first", "It supports only integer keys"], correct: 2 },
    { id: "q49", question: "Which approach is typically used in merge sort's divide-and-conquer strategy?", options: ["Partition and random shuffle", "Divide array, sort halves, then merge", "Greedy local swapping only", "Hashing all elements"], correct: 1 },
    { id: "q50", question: "Which algorithm can be used to find strongly connected components in a directed graph?", options: ["Kruskal's Algorithm", "Kosaraju's Algorithm", "Binary Search", "Insertion Sort"], correct: 1 }
];

// Utility function to shuffle an array
function shuffleArray(array) {
    let newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

// Endpoint to fetch questions
app.get('/api/questions', (req, res) => {
    // Parse the requested limit (default 10, max 50)
    let limit = Number.parseInt(req.query.limit, 10);
    if (Number.isNaN(limit)) limit = 10;
    if (limit < 10) limit = 10;
    if (limit > 50) limit = 50;

    // Shuffle questions and select the requested number
    const shuffled = shuffleArray(dsaQuestions);
    const selectedQuestions = shuffled.slice(0, limit);
    
    // Strip the correct answers before sending to client
    const questionsForClient = selectedQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options
    }));

    res.json(questionsForClient);
});

// Endpoint to submit answers and calculate score
app.post('/api/submit', (req, res) => {
    // The frontend should now submit an object: { userAnswers: { "q1": 2, "q5": 0, ... } }
    const { userAnswers } = req.body;
    
    if (!userAnswers || typeof userAnswers !== 'object') {
        return res.status(400).json({ error: "Invalid answers format provided." });
    }

    let score = 0;
    const breakdown = [];

    // Evaluate based on the submitted keys
    Object.keys(userAnswers).forEach((qId) => {
        const questionData = dsaQuestions.find(q => q.id === qId);
        if (questionData) {
            const userAnswerIndex = userAnswers[qId];
            const isCorrect = userAnswerIndex === questionData.correct;
            
            if (isCorrect) score++;

            breakdown.push({
                question: questionData.question,
                options: questionData.options,
                userAnswerIndex: userAnswerIndex,
                correctAnswerIndex: questionData.correct,
                isCorrect: isCorrect
            });
        }
    });

    res.json({
        score: score,
        total: breakdown.length,
        breakdown: breakdown
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
