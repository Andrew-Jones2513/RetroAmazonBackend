import express from 'express';
import debug from 'debug';
const debugBook = debug('app:book');
import { connect, getBooks, getBookById, updateBook, addBook, deleteBook } from '../../database.js';

// Mini Express Server
const router = express.Router();

// Get all books
router.get('/list', async (req, res) => {
  debugBook("Getting all the books");
  try {
    const db = await connect();
    const books = await getBooks();
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({error: err.stack});
  }
});

// Get a book by the id
router.get('/:id', async (req, res) => {
  // req is the request object
  const id = req.params.id;
  debugBook(`Getting book ${id}`);
  try {
    const book = await getBookById(id);
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({error: err.stack});
  }
});

// Update a book by the id
// Update can use a put or a post
router.put('/update/:id', async (req, res) => {
  const id = req.params.id;
  debugBook(`Updating book ${id}`);
  const updatedBook = req.body;
  if(updatedBook.price){
    updatedBook.price = parseFloat(updatedBook.price);
  }
  try {
    const updateResult = await updateBook(id, updatedBook);
    if(updateResult.modifiedCount == 1){
      res.status(200).json({message: `Book ${id} updated`});
    }
    else{
      res.status(400).json({message: `Book ${id} not updated`});
    }
  } catch (err) {
    res.status(500).json({error: err});
  }
});

// Add a new book to the Mongo Atlas database
router.post('/add', async (req, res) => {
  const newBook = req.body;
  debugBook(`Adding book`);
  try {
    const dbResult = await addBook(newBook);
    if(dbResult.acknowledged == true){
      res.status(200).json({message: `Book ${newBook.title} added with an id of ${dbResult.insertedId}`});
    }
    else{
      res.status(400).json({message: `Book ${newBook.title} not added`});
    }
  } catch (err) {
    res.status(500).json({error: err});
  }
});

// Delete a book by the id
router.delete('/delete/:id', async (req, res) => {
  // Gets the id from the URL
  const id = req.params.id;
  debugBook(`Deleting book ${id}`);
  try {
    const dbResult = await deleteBook(id);
    if(dbResult.deletedCount == 1){
      res.status(200).json({message: `Book ${id} deleted`});
    }
    else{
      res.status(400).json({message: `Book ${id} not deleted`});
    }
  } catch (err) {
    res.status(500).json({error: err});
  }
});

export {router as BookRouter};


// const id = req.params.id;
// const currentBook = books.find((book) => book._id == id);
// For this line to work, you have to have a body parser
// const updatedBook = req.body;
// if (currentBook) {
//   for (const key in updatedBook) {
//     if (currentBook[key] != updatedBook[key]) {
//       currentBook[key] = updatedBook[key];
//     }
//   }
//   // Save the currentBook back into the array
//   const index = books.findIndex((book) => book._id == id);
//   if (index != 1) {
//     books[index] = currentBook;
//   }
//   res.status(200).send(`Book ${id} updated`);
// } else {
//   res.status(404).send(`Book ${id} not found`);
// }
// res.status(updatedBook);