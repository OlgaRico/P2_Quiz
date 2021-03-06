const model = require('./model');
const Sequelize = require ('sequelize');
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
 * Funcion que devuelve una promesa que valida que se ha introducido un valor para el parametro y lo convierte
 * a numero entero. Devuelve el valor de id asociado al parametro.
 *
 * @param id Parametro con el indice a validar.
 */
const validateId = id => {
    return new Sequelize.Promise((resolve,reject) => {
        if (typeof id == "undefined"){
            reject(new Error (`Falta el parámetro <id>.`));
        }else {
            id = parseInt(id);
            if (Number.isNaN(id)){
                reject(new Error(`El valor del parámetro <id> no es número.`));
            }else {
                resolve(id);
            }
        }
    });
};

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 * 
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl,id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz){
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);

        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Funcion que devuelve una promesa que, cuando se cumple , proporciona el texto introducido.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl,text) => {
    return new Sequelize.Promise((resolve,reject) => {
        rl.question(colorize(text,'red'),answer => {
            resolve(answer.trim());
        });
    });
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

    makeQuestion(rl, ' Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, ' Introduzca la respuesta: ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(` ${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError,error => {
            errorlog('El quiz es erróneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error =>{
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Borra un quiz del modelo.
 * @param id Clave del quiz que se quiere editar.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl,id) => {

    validateId(id)
        .then (id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Edita un quiz del modelo.
 * 
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl,id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz){
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
            return makeQuestion(rl, ' Introduzca la pregunta: ')
                .then (q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
                    return makeQuestion(rl, ' Introduzca la respuesta: ')
                        .then(a =>{
                            quiz.question=q;
                            quiz.answer=a;
                            return quiz;
                        });
                });
        })
        .then(quiz =>{
            return quiz.save();
        })
        .then(quiz =>{
            log(` Se ha cambiado el quiz ${colorize(quiz.id,'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error =>{
            errorlog('El quiz es erróneo:');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error =>{
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


/**
* Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
* @param rl Obejto readline usado para implementar el CLI
* @param id Clave del quiz a probar.
*/

//log('Probar el quiz indicado.', 'red');

exports.testCmd = (rl,id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz){
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }
           return makeQuestion(rl,colorize(quiz.question +'? ','red'))
                .then (respuesta => {
                    if (respuesta.toLowerCase().trim() === quiz.answer.toLowerCase()) {
                        log(`Su respuesta es correcta.`);
                        biglog('Correcta', 'green');
                    } else {
                        log(`Su respuesta es incorrecta.`);
                        biglog('Incorrecta', 'red');
                    }
                    ;
                });
        })
               .catch(Sequelize.ValidationError, error =>{
                    errorlog('El quiz es erróneo:');
                    error.errors.forEach(({message}) => errorlog(message));
                })
                .catch(error =>{
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




