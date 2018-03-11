const model = require('./model');

const {log, biglog, errorlog, colorize} = require("./out");


/**
 * Muestra la ayuda.
 */
exports.helpCmd = rl => {
  log("Comandos:");
  log(" h|help - Muestra esta ayuda.");
  log(" list - Listar los quizzes existentes.");
  log(" show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
  log(" add - Añadir un nuevo quiz interactivamente.");
  log(" delete <id> - Borrar el quiz indicado.");
  log(" edit <id> - Editar el quiz indicado.");
  log(" test <id> - Probar el quiz indicado.");
  log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
  log(" credits - Créditos.");
  log(" q|quit - Salir del programa.");
  rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 */
exports.listCmd = rl => {
  //log('Listar todos los quizzes existentes.', 'red');
  model.getAll().forEach((quiz, id) => {
    log(` [${colorize(id, 'magenta')}]: ${quiz.question} `);
  });
  rl.prompt();
}


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 * 
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
   //log('Mostrar el quiz indicado.', 'red');
   if (typeof id === "undefined") {
     errorlog(`Falta el parámetro id.`);
   } else{
     try{
       const quiz = model.getByIndex(id);
       log(` [${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
     } catch(error) {
       errorlog(error.message);
     }
   }
   rl.prompt();
};
 
 
 /**
  * Añade un nuevo quiz al módelo.
  * Pregunta interactivamente por la pregunta y por la respuesta.
  * 
  * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
  * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
  * la llamada a rl.prompt() se debe hacer en la callback de la segunda llamada a rl.question
  * 
  * @param rl Objeto readline usado para implentar el CLI.
  */
exports.addCmd = rl => {
  //log('Añadir un nuevo quiz', 'red');
  rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {
    rl.question(colorize( 'Introduzca la respuesta ', 'red'), answer => {
      model.add(question, answer);
      log(`${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
      rl.prompt();
    });
  });
};


/**
 * Borra un quiz del modelo.
 * 
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
 // log('Borrar el quiz indicado.', 'red');
 if (typeof id === "undefined") {
     errorlog(`Falta el parámetro id.`);
   } else{
     try{
       model.deleteByIndex(id);
     } catch(error) {
       errorlog(error.message);
     }
   }
  rl.prompt();
}


/**
 * Edita un quiz del modelo.
 * 
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
  //log('Editar el quiz indicado.', 'red');
  if (typeof id === "undefined") {
     errorlog(`Falta el parámetro id.`);
   } else{
     try{
        const quiz = model.getByIndex(id);
         
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
         
        rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {
          
          process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
         
          rl.question(colorize( 'Introduzca la respuesta ', 'red'), answer => {
            model.update(id, question, answer);
            log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer} `);
          rl.prompt();
        });
      });
     } catch(error) {
       errorlog(error.message);
       rl.prompt();
     }
   }
};


/**
* Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
*
* @param id Clave del quiz a probar.
*/

//log('Probar el quiz indicado.', 'red');
exports.testCmd = (rl,id) => { 
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
		return makeQuestion(rl, ' Introduzca la respuesta: ')
		.then(a => {
			if(quiz.answer.toUpperCase() === a.toUpperCase().trim()){
				log("Su respuesta es correcta");
				biglog('Correcta', 'green');
			} else{
				log("Su respuesta es incorrecta");
				biglog('Incorrecta', 'red');
			}
		});
		
	})
	.catch(error => {
		errorlog(error.message);
	})
	.then(() => {
		rl.prompt();
	});
};
/**
* Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
* Se gana si se contesta a todos satisfactoriamente.
*/

//log('Jugar.', 'red');
exports.playCmd = (rl) => {
    let score = 0;
	let toBeResolved = [];
	
	const playOne = () => {
		return new Promise((resolve,reject) => {
			
			if(toBeResolved.length <=0){
				console.log("No hay nada mas que preguntar.\nFin del examen. Aciertos:");
				resolve();
				return;
			}
			let pos = Math.floor(Math.random()*toBeResolved.length);
			let quiz = toBeResolved[pos];
			toBeResolved.splice(pos,1);
			
			makeQuestion(rl, quiz.question+'? ')
			.then(answer => {
				if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
					score++;
					console.log("CORRECTO - Lleva ",score, "aciertos");
					resolve(playOne());
				} else {
					console.log("INCORRECTO.\nFin del examen. Aciertos:");
					resolve();
				}	
			})
		})
	}
	
	models.quiz.findAll({raw: true})
	.then(quizzes => {
		toBeResolved = quizzes;
	})
	.then(() => {
		return playOne();
	})
	.catch(error => {
		console.log(error);
	})
	.then(() => {
		biglog(score,'magenta');
		rl.prompt();
	})
};

 
 /**
  * Muestra los nombres de los autores de la práctica.
  */
exports.creditsCmd = rl => {
  log('Autores de la práctica:');
  log('Lucia Martin Perez', 'green');
  log('Olga Rico Diez', 'green');
  rl.prompt();
}


/**
 * Terminar el programa.
 */
exports.quitCmd = rl => {
  rl.close();
  rl.prompt();
}




