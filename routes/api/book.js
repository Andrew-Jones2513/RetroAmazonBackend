import express from 'express';
import debug from 'debug';
const debugBook = debug('app:book');

// Mini Express Server
const router = express.Router();

// Books Array
const books = [
  {
    title: 'Country Bears, The',
    author: 'Vince Glader',
    publication_date: '10/25/1907',
    genre: 'mystery',
    _id: 1,
  },
  {
    title: 'Secret Things (Choses secrètes)',
    author: 'Betteanne Copley',
    publication_date: '8/28/1978',
    genre: 'non-fiction',
    _id: 2,
  },
  {
    title: 'Fitna',
    author: 'Heall Markham',
    publication_date: '5/31/1936',
    genre: 'non-fiction',
    _id: 3,
  },
  {
    title: 'Words, The',
    author: 'Kelly Benech',
    publication_date: '11/9/1958',
    genre: 'non-fiction',
    _id: 4,
  },
  {
    title: 'Muppet Christmas: Letters to Santa, A',
    author: 'Natala Amar',
    publication_date: '1/18/1914',
    genre: 'non-fiction',
    _id: 5,
  },
];

// Get all books
router.get('/list', (req, res) => {
  debugBook("Getting all the books");
  res.json(books);
});

// Get a book by the id
router.get('/:id', (req, res) => {
  const id = req.params.id;
  const book = books.find((book) => book._id == id);
  if (book) {
    res.status(200).send(book);
  } else {
    res.status(404).send({
      message: `Book ${id} not found`,
    });
  }
});

// Update a book by the id
// Update can use a put or a post
router.put('/:id', (req, res) => {
  const id = req.params.id;
  const currentBook = books.find((book) => book._id == id);
  // For this line to work, you have to have a body parser
  const updatedBook = req.body;
  if (currentBook) {
    for (const key in updatedBook) {
      if (currentBook[key] != updatedBook[key]) {
        currentBook[key] = updatedBook[key];
      }
    }
    // Save the currentBook back into the array
    const index = books.findIndex((book) => book._id == id);
    if (index != 1) {
      books[index] = currentBook;
    }
    res.status(200).send(`Book ${id} updated`);
  } else {
    res.status(404).send(`Book ${id} not found`);
  }

  res.status(updatedBook);
});

// Add a new book to the array
router.post('/add', (req, res) => {
  const newBook = req.body;

  if (newBook) {
    // Add a unique id
    const id = books.length + 1;
    newBook._id = id;
    // Add the book to the array
    books.push(newBook);
    res.status(200).json({ message: `Book ${newBook.title} added` });
  } else {
    res.status(400).json({ message: `Error in adding book` });
  }
});

// Delete a book by the id
router.delete('/:id', (req, res) => {
  // Gets the id from the URL
  const id = req.params.id;

  // Finds the index of the book in the array
  const index = books.findIndex((book) => book._id == id);
  if (index != -1) {
    books.slice(index,1);
    res.status(200).json(`Book ${id} deleted`);
  } else {
    res.status(404).json(`Book ${id} not found`);
  }
});

export {router as BookRouter};