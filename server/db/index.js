const mysql=require('mysql')
const mailer=require("../mailer");
const { response } = require('express');
let db=mysql.createConnection({
	connectionLimit:10,
	password:'',
	user:'',
	database:'',
	host:'',
	port:'3306'
}	
);


db.connect((err)=>{
	if(err){
		throw err;
	}
	console.log('Mysql Connected')
})

let dbEngine={}

dbEngine.fetchOne=(res,id)=>{
	let sql=`SELECT game_name,game_developer FROM games WHERE game_id=${id}`
	let query=db.query(sql,(err,result)=>{
		if (err) {
			console.log(err)
			// return false;
		}else{
			res.json(result)
			// console.log()
			// return result;
		}
	})
}

dbEngine.fetch=(res,obj)=>{
	let my_key_table=obj.table_name+"_"+obj.api_key
	//default limit set to 10
	let sql=`SELECT * FROM ${my_key_table} LIMIT ${obj.limit || 10}`;
	db.query(sql,(err,result)=>{
		if(err){
			res.sendStatus(404);console.log(err)
		}
		else{
			res.json(result)
		}
	})
}


dbEngine.remove=(res,obj)=>{
	let my_key_table=obj.table_name+"_"+obj.api_key
	//default limit set to 10
	let sql=`DELETE FROM ${my_key_table} WHERE ${obj.conditions}`;
	//lets store this into our table logs
	api_logging(obj)
	db.query(sql,(err,result)=>{
		if(err){
			res.sendStatus(404);console.log(err)
		}
		else{
			res.send("successfully done")
		}
	})
}

dbEngine.fetch_on=(res,obj)=>{
	let my_key_table=obj.table_name+"_"+obj.api_key
	//default limit set to 10
	//prepare the where statement
	let constraints=prepare_where_constraints(obj.contraints);
	let sql=`SELECT * FROM ${my_key_table} WHERE ${constraints} LIMIT ${obj.limit || 10 }`;
	console.log(sql)
	db.query(sql,(err,result)=>{
		if(err){
			res.sendStatus(404);console.log(err)
		}
		else{
			res.json(result)
		}
	})
}

let prepare_where_constraints=(contraints)=>{
		let data=contraints.split(",")
		let sql="";
		let con=0;
		data.forEach(element => {
			if(con==0){
				let data_to_place=element.split("=")[0]
				let data_to_insert=element.split("=")[1]
				sql=`${data_to_place} = ${data_to_insert}`
			}
				else{
				let data_to_place=element.split("=")[0]
				let data_to_insert=element.split("=")[1]
				sql+=` AND ${data_to_place} = ${data_to_insert}`			
				}
			con++;
	});
		return sql;
}

let prepare_sql_values=(obj)=>{
	let final_table_name = obj.table_name + "_" + obj.api_key;
	let sql=`INSERT INTO  ${final_table_name} (_ID `
	let data=obj.obj.split(",")
	let values=""
	data.forEach(element => {
		let data_to_place=element.split("=")[0]
		let data_to_insert=element.split("=")[1]
		sql+=`, ${data_to_place} `
		values+=`, ${data_to_insert}`
	});
	sql+=`) VALUES( null ${values} )`
	console.log(sql)
	return sql
}

let prepare_update_query=(obj)=>{
	let final_table_name = obj.table_name + "_" + obj.api_key;
	let sql=`UPDATE ${final_table_name} SET  `
	let data = obj.obj.split(",")
	let condition_operators = obj.conditions.split(",")
	let v=0
	data.forEach(element=>{
		let data_to_place = element.split("=")[0]
		let data_to_insert = element.split("=")[1]
		if(v==0){
			v++
			sql += ` ${data_to_place} = ${data_to_insert}`
		}else{
			sql += ` , ${data_to_place} = ${data_to_insert}`
		}
		//this is the update statement preparation
	})
	sql+=" WHERE "
	//set the conditions
	condition_operators.forEach(condition=>{
		let table_row=condition.split("(")[0]
		let table_row_p=condition.split(")")[0]
		let value=condition.split(")")[1]
		let v=0
		let condition_checker = table_row_p.split("(")[1]
		if (v == 0) {
			v++
			sql+=` ${table_row} ${condition_checker} ${value} `
			// sql += ` ${data_to_place} = ${data_to_insert}`
		} else {
			sql+=`, ${table_row} ${condition_checker} ${value} `
			// sql += ` , ${data_to_place} = ${data_to_insert}`
		}
	})
	console.log(sql)
	return sql
}

dbEngine.write=(res,obj)=>{
	//let securitify the page now
	let insert_query=prepare_sql_values(obj)
	let query=db.query(insert_query,(err,response)=>{
		if(err){
			// mailer.sendMailTo("","","","")
			res.sendStatus(403)
				}else{
			let success_report={}
			success_report.status=200
			success_report.connection=true
			res.json(success_report)
		}
	})	
}

dbEngine.update=(res,obj)=>{
	let update_query=prepare_update_query(obj);
	console.log(update_query)
	let query=db.query(update_query,(err,response)=>{
		//the update query runs here
		if (err) {
			// mailer.sendMailTo("","","","")
			res.send(err)
		} else {
			let success_report = {}
			success_report.status = 200
			success_report.connection = true
			res.json(success_report)
		}
	})
}

dbEngine.raw=(res,obj)=>{
	let final_table_name = obj.table_name + "_" + obj.api_key;
	let edited_sql=obj.sql.replace("{}",final_table_name)
	if (edited_sql.split(" ")[0] == "DELETE" || edited_sql.split(" ")[0] == "DROP" || edited_sql.split(" ")[0] == "TRUNCATE"){
		// res.send("Method Forbidden")
		res.sendStatus(403)
		return 0
	}


	let query=db.query(edited_sql,(err,response)=>{
		if(err){
			res.sendStatus(403)
		}else{
			let success_report = {}
			success_report.status = 200
			success_report.connection = true
			success_report.data = response
			res.json(response)
		}
	})
}

dbEngine.test=(res,obj)=>{
	//this is for parameter requests
	let my_key_table=obj.table_name+"_"+obj.api_key
	let sql=`SELECT * FROM ${my_key_table}`;
	console.log(my_key_table)
	let query=db.query(sql,(err,response)=>{
		if(err){
			res.sendStatus(404)
		}
			else{
				res.json({
					connection:true,
					api_key:obj.api_key
				})
			}
	})
}

let api_logging=(obj)=>{
	//create a logging table to log all deleted files
	let my_key_table=obj.table_name+"_"+obj.api_key;//the target table
	let select_query=`SELECT * FROM ${my_key_table} WHERE ${obj.conditions}`;
	let query=db.query(select_query,(err,response)=>{
		if(err){
			res.sendStatus(404)
		}
			else{
				response.forEach(function(iobj) { 
					//prepare an insert value 
					// console.log(mysql_real_escape_string(JSON.stringify(iobj)))
					let loging_query=`INSERT INTO api_log_admin(log_details,log_date,log_api_key) VALUES('${JSON.stringify(iobj)}',NOW(),'${my_key_table}');`;
					db.query(loging_query,(err,response)=>{
						//log updated
					})

				});
			}
	})
}






module.exports = dbEngine;
