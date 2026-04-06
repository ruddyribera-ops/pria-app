import sqlite3
con = sqlite3.connect('pria_estado.db')
con.execute("UPDATE horario_docente SET hora_inicio = '0' || hora_inicio WHERE length(hora_inicio) = 4 AND hora_inicio LIKE '%:%'")
con.commit()
