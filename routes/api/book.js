import express from 'express';
import debug from 'debug';
const debugBook = debug('app:book');
import { connect, getBooks, getBookById, updateBook, addBook, deleteBook } from '../../database.js';
import Joi from 'joi';
import { validBody } from '../../middleware/validBody.js';
import { validId } from '../../middleware/validId.js';
import { isLoggedIn, hasPermission } from '@merlin4/express-auth';

// Mini Express Server
const router = express.Router();

// Book schema
const newBookSchema = Joi.object({
  isbn:Joi.string().trim().min(14).required(),
  title:Joi.string().trim().min(1).required(),
  author:Joi.string().trim().min(1).required(),
  genre:Joi.string().valid('Fiction', 'Magical Realism', 'Dystopian', 'Mystery', 'Young Adult', 'Non-fiction').required(),
  publication_year:Joi.number().integer().min(1900).max(2023).required(),
  price:Joi.number().min(0).required(),
  description:Joi.string().trim().min(1).required(),
});

const updateBookSchema = Joi.object({
  isbn:Joi.string().trim().min(14),
  title:Joi.string().trim().min(1),
  author:Joi.string().trim().min(1),
  genre:Joi.string().valid('Fiction', 'Magical Realism', 'Dystopian', 'Mystery', 'Young Adult', 'Non-fiction'),
  publication_year:Joi.number().integer().min(1900).max(2023),
  price:Joi.number().min(0),
  description:Joi.string().trim().min(1),
});


// Get all books
router.get('/list', isLoggedIn(), hasPermission('canListBooks'), async (req, res) => {
  // req.body - comes from the HTML form typically the name attribute of the controls
  // <input type = 'text' name='txtEmail' />
  // req.body.txtEmail
  
  // req.params
  // Variable that's part of the URL
  // api/Book/1234
  // req.params.id

  // req.query
  // A query string is part of the URL that starts with a ?

  debugBook(`Getting all the books, the query string is ${JSON.stringify(req.query)}`);

  let {keywords, minPrice, maxPrice, genre, sortBy, pageSize, pageNumber} = req.query;
  const match = {}; // match stage of the aggregation pipeline is the filter similar to the where clause in SQL
  let sort = {author: 1}; // default sort stage will sort by author ascending

  // skip and limit stages together help create pagination
  // skip will skip the first n documents
  // limit will limit the number of documents returned

  try {
    // const db = await connect();
    // const books = await getBooks();
    // res.status(200).json(books);
    
    if (keywords) {
      match.$text = {$search: keywords};
    }

    if (genre) {
      match.genre = {$eq: genre};
    }

    if (minPrice && maxPrice) {
      match.price = {$gte: parseFloat(minPrice), $lte: parseFloat(maxPrice)};
    } else if (minPrice) {
      match.price = {$gte: parseFloat(minPrice)};
    } else if (maxPrice) {
      match.price = {$lte: parseFloat(maxPrice)};
    }

    switch(sortBy){
      case "price": sort = {price: 1}; break;
      case "year": sort = {publication_year: 1}; break;
    }

    pageNumber = parseInt(pageNumber) || 1;
    pageSize = parseInt(pageSize) || 100;
    const skip = (pageNumber - 1) * pageSize;
    const limit = pageSize;

    const pipeline = [
      {$match: match},
      {$sort: sort},
      {$skip: skip},
      {$limit: limit}
    ]

    const db = await connect();
    const cursor = await db.collection('Book').aggregate(pipeline);
    const books = await cursor.toArray();
    res.status(200).json(books);

  } catch (err) {
    res.status(500).json({error: err.stack});
  }
});

// Get a book by the id
router.get('/:id', isLoggedIn(), validId('id'), async (req, res) => {
  const id = req.id;
  debugBook(`Getting book ${id}`);
  try {
    const book = await getBookById(id);
    if (book) {
      res.status(200).json(book);
    } else {
      res.status(404).json({ message: `Book ${id} not found` });
    }

  } catch (err) {
    res.status(500).json({error: err.stack});
  }
});

// Update a book by the id
// Update can use a put or a post
router.put('/update/:id', isLoggedIn(), validId('id'), validBody(updateBookSchema), async (req, res) => {
  // req is the request object
  const id = req.id;
  debugBook(`Updating book ${id}`);
  const updatedBook = req.body;
  if(updatedBook.price){
    updatedBook.price = parseFloat(updatedBook.price);
  }
  try {
    const updateResult = await updateBook(id, updatedBook);
    if(updateResult.modifiedCount == 1){
      const edit = {
        timeStamp: new Date(),
        op: 'Update Book',
        collection: 'Book',
        target: id,
        auth: req.auth
      }
      const dbEditResult = saveEdit(edit);
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
router.post('/add', isLoggedIn(), validBody(newBookSchema), async (req, res) => {
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
router.delete('/delete/:id', isLoggedIn(), hasPermission('canDeleteBook'), validId('id'), async (req, res) => {
  // Gets the id from the URL
  const id = req.id;
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