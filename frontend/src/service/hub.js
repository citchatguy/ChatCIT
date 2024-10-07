import request from 'src/service/request'

export function AdicionarHub (data) {
  return request({
    url: '/hub-channel/',
    method: 'post',
    data
  })
}

export function ListarHub () {
  return request({
    url: '/hub-channel/',
    method: 'get'
  })
}

export function EnviarMensagemHub (ticketId, data) {
  return request({
    url: `/hub-message/${ticketId}`,
    method: 'post',
    data
  })
}
